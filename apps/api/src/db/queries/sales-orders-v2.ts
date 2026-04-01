import { salesOrderDto } from "@api/dto/sales-dto";
import { whereSales } from "@api/prisma-where";
import type { TRPCContext } from "@api/trpc/init";
import { transformSalesFilterQuery } from "@api/utils/sales";
import { SalesListInclude } from "@api/utils/sales";
import { composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";

const ordersV2InvoiceStatus = ["paid", "outstanding"] as const;
const ordersV2ProductionStatus = [
  "pending",
  "in progress",
  "completed",
] as const;
const ordersV2SmartStatuses = [
  "pending",
  "queued",
  "ready",
  "transit",
  "completed",
] as const;

export const getOrdersV2Schema = z
  .object({
    q: z.string().optional().nullable(),
    dateRange: z.array(z.string().optional().nullable()).optional().nullable(),
    customerName: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    po: z.string().optional().nullable(),
    orderNo: z.string().optional().nullable(),
    invoiceStatus: z.enum(ordersV2InvoiceStatus).optional().nullable(),
    production: z.enum(ordersV2ProductionStatus).optional().nullable(),
  })
  .extend(paginationSchema.shape);

export type GetOrdersV2Schema = z.infer<typeof getOrdersV2Schema>;

export const getOrdersV2SummarySchema = getOrdersV2Schema.omit({
  cursor: true,
  size: true,
  sort: true,
});

export type GetOrdersV2SummarySchema = z.infer<typeof getOrdersV2SummarySchema>;

type OrdersV2SmartStatus = (typeof ordersV2SmartStatuses)[number];

function toLegacyOrdersQuery(query: GetOrdersV2SummarySchema, userId?: number | null) {
  const legacyQuery: any = {
    salesType: "order",
    q: query.q,
    dateRange: query.dateRange,
    "customer.name": query.customerName,
    phone: query.phone,
    po: query.po,
    salesNo: query.orderNo,
    invoice:
      query.invoiceStatus === "outstanding"
        ? "pending"
        : query.invoiceStatus ?? undefined,
    production: query.production,
  };

  transformSalesFilterQuery(legacyQuery);

  if (legacyQuery.defaultSearch && legacyQuery.showing !== "all sales") {
    legacyQuery.salesRepId = userId ?? undefined;
  }

  if (legacyQuery.showing !== "all sales" && !legacyQuery.q?.trim()) {
    legacyQuery.salesRepId = userId ?? undefined;
  }

  return legacyQuery;
}

function toInvoiceStatus(amountDue: number | null | undefined) {
  return (amountDue ?? 0) <= 0 ? "paid" : "outstanding";
}

function toProductionLabel(status?: string | null, scoreStatus?: string | null) {
  if (scoreStatus && scoreStatus !== "N/A") return scoreStatus;
  if (!status || status === "N/A") return "Pending";
  return status
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toFulfillmentLabel(status?: string | null) {
  if (!status) return "Pending";
  return status
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeStatusValue(status?: string | null) {
  return (status || "").trim().toLowerCase();
}

function toSmartStatus(params: {
  orderStatus?: string | null;
  prodStatus?: string | null;
  productionState?: string | null;
  fulfillmentState?: string | null;
}) {
  const orderStatus = normalizeStatusValue(params.orderStatus);
  const prodStatus = normalizeStatusValue(params.prodStatus);
  const productionState = normalizeStatusValue(params.productionState);
  const fulfillmentState = normalizeStatusValue(params.fulfillmentState);

  if (
    ["delivered", "completed"].includes(orderStatus) ||
    fulfillmentState === "completed"
  ) {
    return "completed" satisfies OrdersV2SmartStatus;
  }

  if (
    ["in transit", "dispatching", "dispatched"].includes(orderStatus) ||
    fulfillmentState === "in progress"
  ) {
    return "transit" satisfies OrdersV2SmartStatus;
  }

  if (
    orderStatus === "ready" ||
    prodStatus === "completed" ||
    productionState === "completed"
  ) {
    return "ready" satisfies OrdersV2SmartStatus;
  }

  if (
    ["queued", "started"].includes(prodStatus) ||
    productionState === "in progress"
  ) {
    return "queued" satisfies OrdersV2SmartStatus;
  }

  return "pending" satisfies OrdersV2SmartStatus;
}

function toSmartStatusLabel(status: OrdersV2SmartStatus) {
  switch (status) {
    case "queued":
      return "Queued";
    case "ready":
      return "Ready";
    case "transit":
      return "Transit";
    case "completed":
      return "Completed";
    default:
      return "Pending";
  }
}

function normalizeOrderRow(
  row: Parameters<typeof salesOrderDto>[0],
) {
  const dto = salesOrderDto(row, false);
  const productionState = dto.status?.production?.status || "pending";
  const fulfillmentState = dto.deliveryStatus || "pending";
  const smartStatus = toSmartStatus({
    orderStatus: row.status,
    prodStatus: row.prodStatus,
    productionState,
    fulfillmentState,
  });

  return {
    id: dto.id,
    uuid: dto.uuid,
    slug: dto.slug,
    orderId: dto.orderId,
    createdAt: dto.createdAt,
    salesDate: dto.salesDate,
    customerName: dto.displayName || "Unknown customer",
    customerPhone: dto.customerPhone || "-",
    address: dto.address || "No address",
    salesRepName: dto.salesRep || "Unassigned",
    poNo: dto.poNo || "-",
    deliveryOption: dto.deliveryOption || "pickup",
    invoiceTotal: dto.invoice.total || 0,
    amountDue: dto.invoice.pending || 0,
    paymentDueDate: dto.dueDate,
    invoiceStatus: toInvoiceStatus(dto.invoice.pending),
    orderStatus: row.status || null,
    prodStatus: row.prodStatus || null,
    productionState,
    productionLabel: toProductionLabel(
      productionState,
      dto.status?.production?.scoreStatus,
    ),
    fulfillmentState,
    fulfillmentLabel: toFulfillmentLabel(fulfillmentState),
    smartStatus,
    smartStatusLabel: toSmartStatusLabel(smartStatus),
  };
}

export async function getOrdersV2(ctx: TRPCContext, query: GetOrdersV2Schema) {
  const { db } = ctx;
  const legacyQuery = toLegacyOrdersQuery(query, ctx.userId);
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereSales(legacyQuery),
    db.salesOrders,
  );

  const rows = await db.salesOrders.findMany({
    where,
    ...searchMeta,
    include: SalesListInclude,
  });

  const data = rows.map(normalizeOrderRow);
  return response(data);
}

export async function getOrdersV2Summary(
  ctx: TRPCContext,
  query: GetOrdersV2SummarySchema,
) {
  const { db } = ctx;
  const where = whereSales(toLegacyOrdersQuery(query, ctx.userId)) ?? {};

  const [totalOrders, invoiceValue, outstandingBalance, paidOrders, evaluatingOrders] =
    await Promise.all([
      db.salesOrders.count({ where }),
      db.salesOrders.aggregate({
        where,
        _sum: {
          grandTotal: true,
        },
      }),
      db.salesOrders.aggregate({
        where,
        _sum: {
          amountDue: true,
        },
      }),
      db.salesOrders.count({
        where: {
          AND: [where, { amountDue: 0 }],
        },
      }),
      db.salesOrders.count({
        where: {
          AND: [where, { status: "Evaluating" }],
        },
      }),
    ]);

  return {
    totalOrders,
    invoiceValue: invoiceValue._sum.grandTotal ?? 0,
    outstandingBalance: outstandingBalance._sum.amountDue ?? 0,
    paidOrders,
    evaluatingOrders,
  };
}
