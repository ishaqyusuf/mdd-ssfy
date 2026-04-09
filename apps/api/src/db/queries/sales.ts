import { salesOrderDto, salesQuoteDto } from "@api/dto/sales-dto";
import { whereSales } from "@api/prisma-where";
import { composeQueryData } from "@gnd/utils/query-response";
import type {
  GetFullSalesDataSchema,
  SaveOrderProductionGateSchema,
  SalesQueryParamsSchema,
} from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import type {
  DykeSalesDoorMeta,
  ItemControlData,
  SalesItemMeta,
  SalesMeta,
  SalesType,
} from "@api/type";
import {
  FullSalesSelect,
  getItemStatConfig,
  SalesListInclude,
} from "@api/utils/sales";
import { getSalesSetting } from "./settings";
import {
  composeQtyMatrix,
  composeSalesItemControlStat,
  composeStepFormDisplay,
  doorItemControlUid,
  itemItemControlUid,
  mouldingItemControlUid,
} from "@api/utils/sales-control";
import { consoleLog, formatCurrency, formatMoney } from "@gnd/utils";
import { calculateSalesDueAmount } from "@sales/sales-transaction";
import { payrollUid } from "@sales/utils/utils";
import {
  isControlReadV2Enabled,
  withSalesControl,
  withSalesListControl,
} from "@gnd/sales";
import z from "zod";
import type { SalesPaymentStatus } from "@sales/constants";

function isControlReadParityEnabled() {
  return ["1", "true", "yes", "on"].includes(
    String(process.env.CONTROL_READ_PARITY || "")
      .trim()
      .toLowerCase(),
  );
}

export async function getSales(
  ctx: TRPCContext,
  query: SalesQueryParamsSchema,
) {
  if (!query.salesType) query.salesType = "order";
  if (query.defaultSearch) {
    if (query.showing != "all sales") query.salesRepId = ctx.userId!;
  }
  if (query.showing != "all sales" && !query.q?.trim())
    query.salesRepId = ctx.userId!;

  const { db } = ctx;
  const { response, searchMeta, where, meta } = await composeQueryData(
    // const where = ;
    query,
    whereSales(query),
    db.salesOrders,
  );

  const data = await db.salesOrders.findMany({
    where,
    ...searchMeta,
    include: SalesListInclude,
  });
  const notCounts = await salesNotesCount(
    data?.map((a) => a.id),
    ctx.db,
  );

  const rows = data
    .map((o) => salesOrderDto(o, !!query.bin))
    .map((d) => ({
      ...d,
      noteCount: 0,
      ...(notCounts[d.id.toString()] || {}),
    }));
  const rowsWithControl =
    query.salesType === "order"
      ? isControlReadV2Enabled()
        ? await withSalesListControl(rows, db)
        : await withSalesControl(rows, db)
      : rows;

  if (
    query.salesType === "order" &&
    isControlReadV2Enabled() &&
    isControlReadParityEnabled()
  ) {
    const legacyRows = await withSalesControl(rows, db);
    const legacyById = new Map(legacyRows.map((row: any) => [row.id, row]));
    const mismatches: number[] = [];
    for (const row of rowsWithControl as any[]) {
      const legacy = legacyById.get(row.id);
      const control = row.control;
      if (!legacy || !control) continue;
      if (
        legacy.statistic?.productionStatus !== control.productionStatus ||
        legacy.statistic?.dispatchStatus !== control.dispatchStatus ||
        legacy.statistic?.packables?.total !== control.packables?.total ||
        legacy.statistic?.pendingDispatch?.total !==
          control.pendingDispatch?.total
      ) {
        mismatches.push(row.id);
      }
    }
    if (mismatches.length) {
      console.warn("[control-read-parity][sales] mismatches", {
        mismatchCount: mismatches.length,
        salesIds: mismatches.slice(0, 20),
      });
    }
  }

  const result = await response(rowsWithControl);

  return result;
}
export async function sales(ctx: TRPCContext, query: SalesQueryParamsSchema) {
  query.salesType = "quote";
  //  if (query.defaultSearch) {
  //    if (query.showing != "all sales") query.salesRepId = ctx.userId!;
  //  }
  //  if (query.showing != "all sales" && !query.q?.trim())
  //    query.salesRepId = ctx.userId!;
  //   // if (query.showing != "all sales") query.salesRepId = ctx.userId!;
  const { db } = ctx;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereSales(query),
    db.salesOrders,
  );

  const data = await db.salesOrders.findMany({
    where,
    ...searchMeta,
    include: SalesListInclude,
  });

  return await response(
    data
      .map((o) => salesQuoteDto(o, !!query.bin))
      .map((d) => ({
        ...d,
      })),
  );
}
export async function getOrders(
  ctx: TRPCContext,
  query: SalesQueryParamsSchema,
) {
  query.salesType = "order";
  if (query.defaultSearch && !query.bin) {
    if (query.showing != "all sales") query.salesRepId = ctx.userId!;
    if (query.showing != "all sales" && !query.q?.trim())
      query.salesRepId = ctx.userId!;
  }
  const { db } = ctx;

  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereSales(query),
    db.salesOrders,
  );

  const data = await db.salesOrders.findMany({
    where,
    ...searchMeta,
    include: SalesListInclude,
  });
  const notCounts = await salesNotesCount(
    data?.map((a) => a.id),
    ctx.db,
  );

  const rows = data
    .map((o) => salesOrderDto(o, !!query.bin))
    .map((d) => ({
      ...d,
      noteCount: 0,
      ...(notCounts[d.id.toString()] || {}),
    }));
  const rowsWithControl = isControlReadV2Enabled()
    ? await withSalesListControl(rows, db)
    : await withSalesControl(rows, db);
  const result = await response(rowsWithControl as any);
  return result;
}
export async function getQuotes(
  ctx: TRPCContext,
  query: SalesQueryParamsSchema,
) {
  query.salesType = "quote";

  const { db } = ctx;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereSales(query),
    db.salesOrders,
  );

  const data = await db.salesOrders.findMany({
    where,
    ...searchMeta,
    include: SalesListInclude,
  });

  return await response(
    data
      .map((o) => salesQuoteDto(o, !!query.bin))
      .map((d) => ({
        ...d,
      })),
  );
}

async function salesNotesCount(salesIds: number[], prisma) {
  if (!salesIds || salesIds.length === 0) return {};
  const notes = await prisma.notePad.findMany({
    where: {
      deletedAt: null,
      OR: salesIds?.map((v) => ({
        AND: [
          {
            tags: {
              some: {
                tagName: "salesId",
                deletedAt: null,
                tagValue: v?.toString(),
              },
            },
          },
          {
            tags: {
              some: {
                OR: [
                  {
                    tagName: "type",
                    deletedAt: null,
                    tagValue: "production",
                  },
                  {
                    tagName: "type",
                    deletedAt: null,
                    tagValue: "general",
                  },
                ],
              },
            },
          },
        ],
      })),
    },
    select: {
      id: true,
      tags: {
        where: {
          tagName: "salesId",
          tagValue: {
            in: salesIds.map((a) => String(a)),
          },
        },
        select: {
          tagValue: true,
        },
      },
    },
  });

  const resp: {
    [id in string]: {
      noteCount?: number;
    };
  } = {};

  // salesIds.forEach((s) => {
  //   const noteCount = notes?.filter((a) =>
  //     a.tags?.some((t) => t.tagValue === String(s))
  //   )?.length;
  //   if (noteCount)
  //     resp[String(s)] = {
  //       noteCount,
  //     };
  // });
  const countMap = new Map<string, number>();
  notes.forEach((a) => {
    a.tags.forEach((t) => {
      countMap.set(t.tagValue, (countMap.get(t.tagValue) || 0) + 1);
    });
  });

  salesIds.forEach((s) => {
    const noteCount = countMap.get(String(s));
    if (noteCount) resp[String(s)] = { noteCount };
  });
  return resp;
}

export async function startNewSales(
  ctx: TRPCContext,
  customerId?: number | null,
) {
  const { db } = ctx;

  // const newSalesOrder = await db.salesOrders.create({
  //   data: {
  //     // type: "order", // or "invoice" based on your default
  //     // status: "draft",
  //     // customerId: customerId || undefined,
  //     // Add other default fields as necessary
  //   } as any,
  // });
  // return newSalesOrder;
}

export async function getSalesLifeCycle(
  ctx: TRPCContext,
  params: GetFullSalesDataSchema,
) {
  const { assignedToId } = params;
  let select = FullSalesSelect;
  if (params.assignedToId)
    select.assignments.where.assignedToId = params.assignedToId as any;
  const order = await ctx.db.salesOrders.findFirstOrThrow({
    where: {
      type: "order" as SalesType,
      orderId: params.salesNo || undefined,
      id: params.salesId || undefined,
    },
    select,
  });
  const meta = order.meta as any as SalesMeta;
  const setting = await getSalesSetting(ctx);
  let items: ItemControlData[] = [];
  order.items.map((item) => {
    const { multiDyke, multiDykeUid } = item;

    let baseItem =
      !multiDyke && multiDykeUid
        ? order.items.find(
            (a) => a.multiDyke && multiDykeUid == a.multiDykeUid,
          ) || item
        : item;
    function addItem(item: ItemControlData) {
      item.salesId = order.id;
      item.itemConfig = getItemStatConfig({
        isDyke: !!order.isDyke,
        formSteps: baseItem.formSteps,
        setting: setting.data,
        // qty: baseItem.qty,
        dykeProduction: baseItem.dykeProduction,
        swing: baseItem.swing,
        prodOverride: item.prodOverride,
      });
      item.analytics = composeSalesItemControlStat(
        item,
        // item.controlUid,
        // item.qty,
        order,
        // item.itemConfig,
      );
      const hands = assignedToId
        ? item.analytics.stats?.prodAssigned
        : item.analytics?.stats?.qty;
      let handTitle = "";
      if (hands?.qty) {
        if (hands?.lh || hands.rh)
          handTitle = [
            hands?.lh ? `${hands?.lh} LH` : null,
            hands?.rh ? `${hands?.rh} RH` : null,
          ]
            ?.filter(Boolean)
            ?.join(" & ");
        else handTitle = `QTY: ${hands.qty}`;
      }
      item.subtitle = [
        item.sectionTitle,
        item.size,
        item.swing,
        handTitle,
        assignedToId
          ? null
          : item.unitLabor
            ? `$ ${formatCurrency(item.unitLabor)}/qty labor`
            : `no labor cost`,
      ]
        ?.filter(Boolean)
        .join(" | ");

      items.push(item);
    }
    const itemIndex = (item.meta as any as SalesItemMeta)?.lineIndex;
    const hpt = item.housePackageTool;
    const doors = hpt?.doors;
    let controlUid;
    let { configs, sectionTitle } = composeStepFormDisplay(
      item.formSteps,
      item.dykeDescription,
    );
    if (!order.isDyke || (!doors?.length && !hpt?.door)) {
      controlUid = hpt
        ? mouldingItemControlUid(item.id, hpt?.id)
        : itemItemControlUid(item.id);
      let title = item.description;
      let hidden = !order.isDyke && (title?.includes("***") || !item.qty);
      if (hidden) sectionTitle = title?.replaceAll("*", "");
      addItem({
        controlUid,
        qty: {
          qty: item.qty,
          noHandle: true,
        },
        hptId: hpt?.id,
        sectionTitle,
        itemIndex,
        title: title?.replaceAll("*", "")!,
        itemId: item.id,
        unitCost: item.rate!,
        totalCost: item.total!,
        noHandle: false,
        configs,
      });
    }
    if (doors?.length) {
      doors.map((door) => {
        const title = `${
          door?.stepProduct?.door?.title ||
          door?.stepProduct?.product?.title ||
          door.stepProduct?.name
        }`;
        controlUid = doorItemControlUid(door.id, door.dimension);
        const qty = composeQtyMatrix(door.rhQty, door.lhQty, door.totalQty);
        const doorMeta = door.meta as DykeSalesDoorMeta;
        const unitLabor = doorMeta?.unitLabor || meta?.laborConfig?.rate;
        addItem({
          unitLabor,
          controlUid,
          sectionTitle,
          doorId: door.id,
          hptId: hpt?.id,
          dim: door.dimension,
          size: door.dimension,
          itemIndex,
          title,
          itemId: item.id,
          unitCost: door.unitPrice!,
          totalCost: door.lineTotal!,
          swing: door.swing!,
          qty: qty,
          noHandle: qty.noHandle,
          configs,
          prodOverride: doorMeta?.prodOverride,
        });
      });
    }
  });
  items = items.sort((a, b) => a.itemIndex! - b.itemIndex!);
  // order.deliveries.
  await Promise.all(
    items.map(async (item) => {
      if (item.analytics?.assignmentUidUpdates?.length)
        await ctx.db.orderItemProductionAssignments.updateMany({
          where: {
            id: {
              in: item.analytics.assignmentUidUpdates,
            },
          },
          data: {
            salesItemControlUid: item.controlUid,
          },
        });
    }),
  );

  return {
    items,
    orderNo: order.orderId,
    orderId: order.id,
    deliveries: order.deliveries,
    order,
    orderMeta: order.meta as any as SalesMeta,
    // order
  };
}
async function updateSalesDueAmount(id, _tx) {
  await calculateSalesDueAmount(_tx, id);
}
interface Props {
  userId: number;
  orderId: number;
  submissionId?: number;
  salesPaymentId?: number;
  salesAmount?: number;
  wage?: number;
  description?: string;
  headline?: string;
  itemUid?: string;
}
export async function createPayrollAction(data: Props, tx) {
  // const userId = await authId();
  const profile = await tx.employeeProfile.findFirst({
    where: {
      employees: {
        some: {
          id: data.userId,
        },
      },
    },
  });
  const salesComissionPercentage = profile?.salesComissionPercentage || 0;
  const commission = data?.salesAmount
    ? formatMoney(data.salesAmount * (salesComissionPercentage / 100))
    : data?.wage;
  const uid = payrollUid(data.orderId, data.salesPaymentId, data.submissionId);
  await tx.payroll.create({
    data: {
      uid,
      amount: commission,
      itemUid: data.itemUid,
      status: "PENDING",
      type: data?.submissionId ? "WAGE" : "COMMISSION",
      orderId: data.orderId,
      userId: data.userId,
      description: data.description,
      history: {
        create: {
          status: "PENDING",
          note: "created",
          user: {
            connect: { id: data.userId },
          },
        },
      },
    },
    // update: {
    //     amount: commission,
    // },
  });
}

/*
salesOverview: publicProcedure
      .input(salesOverviewSchema)
      .query(async (props) => {
        return salesOverview(props.ctx, props.input);
      }),
*/
const salesOverviewSchema = z.object({
  slug: z.string(),
});
type SalesOverviewSchema = z.infer<typeof salesOverviewSchema>;

async function salesOverview(
  ctx: TRPCContext,
  query: SalesOverviewSchema,
) {
  const { db } = ctx;

  const sale = await db.salesOrders.findFirstOrThrow({
    where: {
      slug: query.slug,
    },
    select: {
      orderId: true,
      id: true,
      amountDue: true,
      grandTotal: true,
      createdAt: true,
      deliveryOption: true,
      meta: true,
      deliveries: {
        where: {
          deletedAt: null,
        },
      },
      payments: {
        where: {
          status: "success" as SalesPaymentStatus,
          deletedAt: null,
        },
        select: {
          amount: true,
        },
      },
      extraCosts: {
        select: {
          amount: true,
          label: true,
          id: true,
        },
      },
      customer: {
        select: {
          businessName: true,
          name: true,
          email: true,
        },
      },
      salesRep: {
        select: {
          name: true,
          id: true,
        },
      },
    },
  });
}

export async function saveOrderProductionGate(
  ctx: TRPCContext,
  input: SaveOrderProductionGateSchema,
) {
  const { db, userId } = ctx;
  const order = await db.salesOrders.findUnique({
    where: { id: input.salesOrderId },
    select: {
      id: true,
      type: true,
      prodDueDate: true,
    },
  });

  if (!order) throw new Error("Order not found.");
  if (order.type !== "order") {
    throw new Error("Production gate can only be set on sales orders.");
  }
  if (
    input.ruleType === "lead_time_before_delivery" &&
    !order.prodDueDate
  ) {
    throw new Error(
      "Set a production due date before using a lead-time kickoff rule.",
    );
  }

  const gate = await db.orderProductionGate.upsert({
    where: {
      salesOrderId: input.salesOrderId,
    },
    create: {
      salesOrderId: input.salesOrderId,
      status: "defined",
      ruleType: input.ruleType,
      leadTimeValue:
        input.ruleType === "lead_time_before_delivery"
          ? input.leadTimeValue
          : null,
      leadTimeUnit:
        input.ruleType === "lead_time_before_delivery"
          ? input.leadTimeUnit
          : null,
      definedAt: new Date(),
      definedByUserId: userId,
    },
    update: {
      status: "defined",
      ruleType: input.ruleType,
      leadTimeValue:
        input.ruleType === "lead_time_before_delivery"
          ? input.leadTimeValue
          : null,
      leadTimeUnit:
        input.ruleType === "lead_time_before_delivery"
          ? input.leadTimeUnit
          : null,
      definedAt: new Date(),
      definedByUserId: userId,
      triggeredAt: null,
    },
  });

  const sale = await db.salesOrders.findUniqueOrThrow({
    where: { id: input.salesOrderId },
    include: SalesListInclude,
  });

  return {
    gateId: gate.id,
    sale: salesOrderDto(sale),
  };
}
