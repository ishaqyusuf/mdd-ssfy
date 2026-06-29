import { salesOrderDto } from "@api/dto/sales-dto";
import { whereSales } from "@api/prisma-where";
import type { SalesQueryParamsSchema } from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import { transformSalesFilterQuery } from "@api/utils/sales";
import { SalesListInclude } from "@api/utils/sales";
import type { Prisma } from "@gnd/db";
import {
	isControlReadV2Enabled,
	withSalesControl,
	withSalesListControl,
} from "@gnd/sales";
import { getSalesOrderLifecycleStatusInfo } from "@gnd/sales/order-status";
import { repairSalesInvoiceCccDisplay } from "@gnd/sales/payment-system";
import {
	INVOICE_FILTER_OPTIONS,
	PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
	PRODUCTION_FILTER_OPTIONS,
	PRODUCTION_STATUS,
	SALES_DISPATCH_FILTER_OPTIONS,
} from "@gnd/utils/constants";
import { composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import { SALES_HAS_FILTER_OPTIONS } from "@sales/filter-constants";
import {
	getSalesPriorityLabel,
	normalizeSalesPriority,
	salesPrioritySchema,
} from "@sales/priority";
import { z } from "zod";
import { salesNotesCount } from "./sales";

const ordersV2InvoiceStatus = ["paid", "outstanding"] as const;

const ordersV2FilterShape = {
	q: z.string().optional().nullable(),
	dateRange: z.array(z.string()).optional().nullable(),
	salesIds: z.array(z.number()).optional().nullable(),
	"address.id": z.number().optional().nullable(),
	customerName: z.string().optional().nullable(),
	"customer.name": z.string().optional().nullable(),
	phone: z.string().optional().nullable(),
	po: z.string().optional().nullable(),
	item: z.string().optional().nullable(),
	orderNo: z.string().optional().nullable(),
	salesNo: z.string().optional().nullable(),
	sort: z.array(z.string()).optional().nullable(),
	invoiceStatus: z.enum(ordersV2InvoiceStatus).optional().nullable(),
	invoice: z.enum(INVOICE_FILTER_OPTIONS).optional().nullable(),
	production: z.enum(PRODUCTION_FILTER_OPTIONS).optional().nullable(),
	"production.status": z.enum(PRODUCTION_STATUS).optional().nullable(),
	"production.assignment": z
		.enum(PRODUCTION_ASSIGNMENT_FILTER_OPTIONS)
		.optional()
		.nullable(),
	"dispatch.status": z
		.enum(SALES_DISPATCH_FILTER_OPTIONS)
		.optional()
		.nullable(),
	priority: salesPrioritySchema.optional().nullable(),
	"sales.priority": salesPrioritySchema.optional().nullable(),
	"sales.rep": z.string().optional().nullable(),
	has: z.enum(SALES_HAS_FILTER_OPTIONS).optional().nullable(),
	showing: z.enum(["all sales"]).optional().nullable(),
};

export const getOrdersSchema = z
	.object(ordersV2FilterShape)
	.extend(paginationSchema.shape);

export type GetOrdersSchema = z.infer<typeof getOrdersSchema>;

export const getOrdersSummarySchema = z.object({
	...ordersV2FilterShape,
	bin: paginationSchema.shape.bin,
});

export type GetOrdersSummarySchema = z.infer<typeof getOrdersSummarySchema>;

type LegacyOrdersQuery = Partial<SalesQueryParamsSchema> &
	Record<string, unknown> & {
		defaultSearch?: boolean;
		showing?: string;
		q?: string | null;
		salesRepId?: number;
	};

function toLegacyOrdersQuery(
	query: GetOrdersSummarySchema,
	userId?: number | null,
) {
	const legacyQuery: LegacyOrdersQuery = {
		salesType: "order",
		q: query.q,
		dateRange: query.dateRange,
		salesIds: query.salesIds,
		"address.id": query["address.id"],
		"customer.name": query["customer.name"] ?? query.customerName,
		phone: query.phone,
		po: query.po,
		item: query.item,
		salesNo: query.salesNo ?? query.orderNo,
		invoice:
			query.invoice ??
			(query.invoiceStatus === "outstanding"
				? "pending"
				: (query.invoiceStatus ?? undefined)),
		production: query.production,
		"production.status": query["production.status"],
		"production.assignment": query["production.assignment"],
		"dispatch.status": query["dispatch.status"],
		"sales.priority": query["sales.priority"] ?? query.priority,
		"sales.rep": query["sales.rep"],
		has: query.has,
		bin: query.bin,
		showing: query.showing ?? undefined,
	};

	transformSalesFilterQuery(legacyQuery as SalesQueryParamsSchema);

	if (legacyQuery.defaultSearch && legacyQuery.showing !== "all sales") {
		legacyQuery.salesRepId = userId ?? undefined;
	}

	if (legacyQuery.showing !== "all sales" && !legacyQuery.q?.trim()) {
		legacyQuery.salesRepId = userId ?? undefined;
	}

	return legacyQuery as SalesQueryParamsSchema;
}

function toInvoiceStatus(amountDue: number | null | undefined) {
	return (amountDue ?? 0) <= 0 ? "paid" : "outstanding";
}

function toProductionLabel(
	status?: string | null,
	scoreStatus?: string | null,
) {
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

type LifecycleQtySnapshot = {
	total?: number | string | null;
	qty?: number | string | null;
};

type ControlAwareOrderRow = ReturnType<typeof normalizeOrderRow> & {
	control?: {
		productionStatus?: string | null;
		dispatchStatus?: string | null;
		packed?: LifecycleQtySnapshot | null;
		pendingPacking?: LifecycleQtySnapshot | null;
		pendingDispatch?: LifecycleQtySnapshot | null;
		packables?: LifecycleQtySnapshot | null;
	};
	statistic?: {
		packed?: LifecycleQtySnapshot | null;
		pendingPacking?: LifecycleQtySnapshot | null;
		pendingDispatch?: LifecycleQtySnapshot | null;
		packables?: LifecycleQtySnapshot | null;
	};
};

export function normalizeOrderRow(
	row: Parameters<typeof salesOrderDto>[0],
	noteCount = 0,
) {
	const dto = salesOrderDto(row, false);
	const baseInvoiceTotal = dto.invoice.total || 0;
	const amountPaid = dto.invoice.paid || 0;
	const amountDue = dto.invoice.pending || 0;
	const repairedInvoiceTotal = repairSalesInvoiceCccDisplay({
		baseTotal: baseInvoiceTotal,
		meta: row.meta,
	});
	const displayCcc = repairedInvoiceTotal.ccc;
	const productionState = dto.status?.production?.status || "pending";
	const fulfillmentState = dto.deliveryStatus || "pending";
	const lifecycleStatus = getSalesOrderLifecycleStatusInfo({
		orderStatus: row.status,
		legacyProductionStatus: row.prodStatus,
		productionStatus: productionState,
		fulfillmentStatus: fulfillmentState,
	});

	return {
		id: dto.id,
		uuid: dto.uuid,
		slug: dto.slug,
		orderId: dto.orderId,
		createdAt: dto.createdAt,
		salesDate: dto.salesDate,
		displayName: dto.displayName || "Unknown customer",
		customerName: dto.displayName || "Unknown customer",
		customerPhone: dto.customerPhone || "-",
		customerId: dto.customerId,
		email: dto.email,
		accountNo: dto.accountNo,
		type: dto.type,
		address: dto.address || "No address",
		salesRepName: dto.salesRep || "Unassigned",
		salesRepInitial: dto.salesRepInitial || "",
		poNo: dto.poNo || "-",
		inboundStatus: dto.inboundStatus || null,
		isDealerSale: dto.isDealerSale,
		noteCount,
		deliveryOption: dto.deliveryOption || "pickup",
		priority: normalizeSalesPriority(row.priority),
		priorityLabel: getSalesPriorityLabel(row.priority),
		baseInvoiceTotal: repairedInvoiceTotal.baseTotal,
		displayCcc,
		invoiceTotal: repairedInvoiceTotal.totalWithCcc,
		amountPaid,
		amountDue,
		displayAmountPaid: dto.invoice.displayPaid ?? amountPaid,
		displayAmountDue: dto.invoice.displayPending ?? amountDue,
		due: dto.due,
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
		status: lifecycleStatus.status,
		statusLabel: lifecycleStatus.label,
		statusTone: lifecycleStatus.tone,
	};
}

function applyControlAwareLifecycle(row: ControlAwareOrderRow) {
	const control = row.control;
	const statistic = row.statistic;
	const productionStatus =
		control?.productionStatus && control.productionStatus !== "unknown"
			? control.productionStatus
			: row.productionState;
	const fulfillmentStatus =
		control?.dispatchStatus && control.dispatchStatus !== "unknown"
			? control.dispatchStatus
			: row.fulfillmentState;
	const lifecycleStatus = getSalesOrderLifecycleStatusInfo({
		orderStatus: row.orderStatus,
		legacyProductionStatus: row.prodStatus,
		productionStatus,
		fulfillmentStatus,
		hasProductionWork: productionStatus === "N/A" ? false : undefined,
		packed: control?.packed || statistic?.packed,
		pendingPacking: control?.pendingPacking || statistic?.pendingPacking,
		pendingDispatch: control?.pendingDispatch || statistic?.pendingDispatch,
		packables: control?.packables || statistic?.packables,
	});

	return {
		...row,
		productionState: productionStatus,
		productionLabel: toProductionLabel(productionStatus),
		fulfillmentState: fulfillmentStatus,
		fulfillmentLabel: toFulfillmentLabel(fulfillmentStatus),
		status: lifecycleStatus.status,
		statusLabel: lifecycleStatus.label,
		statusTone: lifecycleStatus.tone,
	};
}

function ordersV2Sort(
	sort: string,
	sortOrder: string,
): Prisma.SalesOrdersOrderByWithRelationInput {
	const direction = sortOrder === "asc" ? "asc" : "desc";

	switch (sort) {
		case "orderId":
			return { orderId: direction };
		case "status":
			return { status: direction };
		case "createdAt":
		case "salesDate":
			return { createdAt: direction };
		case "grandTotal":
		case "invoiceTotal":
			return { grandTotal: direction };
		case "amountDue":
			return { amountDue: direction };
		case "prodStatus":
		case "productionLabel":
			return { prodStatus: direction };
		case "deliveredAt":
		case "fulfillmentLabel":
			return { deliveredAt: direction };
		case "salesRepName":
			return { salesRep: { name: direction } };
		case "customerName":
			return { customer: { businessName: direction } };
		default:
			return { createdAt: "desc" };
	}
}

export async function getOrders(ctx: TRPCContext, query: GetOrdersSchema) {
	const { db } = ctx;
	const legacyQuery = toLegacyOrdersQuery(query, ctx.userId);
	const { response, searchMeta, where } = await composeQueryData(
		query,
		whereSales(legacyQuery),
		db.salesOrders,
		{ sortFn: ordersV2Sort },
	);

	const rows = await db.salesOrders.findMany({
		where,
		...searchMeta,
		include: SalesListInclude,
	});

	const noteCounts = await salesNotesCount(
		rows.map((sale) => ({
			id: sale.id,
			orderId: sale.orderId,
		})),
		db,
	);
	const normalizedRows = rows.map((row) =>
		normalizeOrderRow(row, noteCounts[row.id.toString()]?.noteCount ?? 0),
	);
	const rowsWithControl = isControlReadV2Enabled()
		? await withSalesListControl(normalizedRows, db)
		: await withSalesControl(normalizedRows, db);
	const data = rowsWithControl.map((row) =>
		applyControlAwareLifecycle(row as ControlAwareOrderRow),
	);
	return response(data);
}

export async function getOrdersSummary(
	ctx: TRPCContext,
	query: GetOrdersSummarySchema,
) {
	const { db } = ctx;
	const where = whereSales(toLegacyOrdersQuery(query, ctx.userId)) ?? {};

	const [
		totalOrders,
		invoiceValue,
		outstandingBalance,
		paidOrders,
		evaluatingOrders,
	] = await Promise.all([
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
