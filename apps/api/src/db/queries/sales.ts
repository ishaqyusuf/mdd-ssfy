import { salesOrderDto, salesQuoteDto } from "@api/dto/sales-dto";
import { whereSales } from "@api/prisma-where";
import { composeQueryData } from "@gnd/utils/query-response";
import type {
  GetFullSalesDataSchema,
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
import { consoleLog, formatCurrency } from "@gnd/utils";
import { calculateSalesDueAmount } from "@sales/sales-transaction";

export async function getSales(
  ctx: TRPCContext,
  query: SalesQueryParamsSchema
) {
  if (!query.salesType) query.salesType = "order";
  if (query.defaultSearch) {
    if (query.showing != "all sales") query.salesRepId = ctx.userId!;
  }
  if (query.showing != "all sales" && !query.q?.trim())
    query.salesRepId = ctx.userId!;

  const { db } = ctx;
  const { response, searchMeta, where, meta } = await composeQueryData(
    query,
    whereSales(query),
    db.salesOrders
  );

  const data = await db.salesOrders.findMany({
    where,
    ...searchMeta,
    include: SalesListInclude,
  });
  const notCounts = await salesNotesCount(
    data?.map((a) => a.id),
    ctx.db
  );

  const result = await response(
    data.map(salesOrderDto).map((d) => ({
      ...d,
      ...(notCounts[d.id.toString()] || {}),
    }))
  );

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
    db.salesOrders
  );

  const data = await db.salesOrders.findMany({
    where,
    ...searchMeta,
    include: SalesListInclude,
  });

  return await response(
    data.map(salesQuoteDto).map((d) => ({
      ...d,
    }))
  );
}
export async function __getQuotes(
  ctx: TRPCContext,
  query: SalesQueryParamsSchema
) {
  query.salesType = "order";

  const { db } = ctx;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereSales(query),
    db.salesOrders
  );

  const data = await db.salesOrders.findMany({
    where,
    ...searchMeta,
    include: SalesListInclude,
  });

  return await response(
    data.map(salesQuoteDto).map((d) => ({
      ...d,
    }))
  );
}
export async function getQuotes(
  ctx: TRPCContext,
  query: SalesQueryParamsSchema
) {
  query.salesType = "quote";

  const { db } = ctx;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereSales(query),
    db.salesOrders
  );

  const data = await db.salesOrders.findMany({
    where,
    ...searchMeta,
    include: SalesListInclude,
  });

  return await response(
    data.map(salesQuoteDto).map((d) => ({
      ...d,
    }))
  );
}

export async function salesNotesCount(salesIds: number[], prisma) {
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
  customerId?: number | null
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
  params: GetFullSalesDataSchema
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
            (a) => a.multiDyke && multiDykeUid == a.multiDykeUid
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
        order
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
      item.dykeDescription
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
    })
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
export async function updateSalesDueAmount(id, _tx) {
  await calculateSalesDueAmount(_tx, id);
}
