import { GetFullSalesDataSchema } from "../schema";
import {
  Db,
  DykeSalesDoorMeta,
  ItemControlData,
  SalesItemMeta,
  SalesMeta,
  SalesType,
} from "../types";
import { FullSalesSelect, getItemStatConfig } from "../utils/utils";
import { getSalesSetting } from "./settings";
import {
  composeQtyMatrix,
  composeSalesItemControlStat,
  composeStepFormDisplay,
  doorItemControlUid,
  itemItemControlUid,
  mouldingItemControlUid,
  qtyMatrixDifference,
  qtyMatrixSum,
  transformQtyHandle,
} from "../utils/sales-control";
import { formatCurrency, RenturnTypeAsync, sum } from "@gnd/utils";
import { hasQty } from "@gnd/utils/sales";

export type SalesInfoData = RenturnTypeAsync<typeof salesInformationData>;
type SalesInfoDataItem = SalesInfoData["order"]["items"][number];
export async function salesInformationData(
  db: Db,
  params: GetFullSalesDataSchema
) {
  const { assignedToId } = params;
  let select = FullSalesSelect;
  if (params.assignedToId)
    select.assignments.where.assignedToId = params.assignedToId as any;
  const order = await db.salesOrders.findFirstOrThrow({
    where: {
      type: "order" as SalesType,
      orderId: params.salesNo || undefined,
      id: params.salesId || undefined,
    },
    select,
  });
  const meta = order.meta as any as SalesMeta;
  const setting = await getSalesSetting(db);
  return {
    order: {
      ...order,
      meta,
    },
    setting,
    assignedToId,
  };
}
export function composeSalesItemControl(
  data: SalesInfoData,
  item: SalesInfoDataItem,
  door?
) {
  const { order, setting, assignedToId } = data;
  const itemIndex = (item.meta as any as SalesItemMeta)?.lineIndex;
  const hpt = item.housePackageTool;
  const doors = hpt?.doors;
  let title, hidden, unitLabor;
  let { configs, sectionTitle } = composeStepFormDisplay(
    item.formSteps,
    item.dykeDescription
  );
  const doorMeta = door?.meta as DykeSalesDoorMeta;
  // const meta = item.meta as any as SalesItemMeta;
  if (door) {
    unitLabor = doorMeta?.unitLabor || order?.meta?.laborConfig?.rate;
    title = `${
      door?.stepProduct?.door?.title ||
      door?.stepProduct?.product?.title ||
      door.stepProduct?.name
    }`;
    // controlUid = doorItemControlUid(door.id, door.dimension);
  } else {
    title = item.description;
    hidden = !order.isDyke && (title?.includes("***") || !item.qty);
    if (hidden) title = sectionTitle = title?.replaceAll("*", "");
  }
  const qty = door
    ? composeQtyMatrix(door.rhQty, door.lhQty, door.totalQty)
    : {
        qty: item.qty,
        noHandle: true,
      };

  const { multiDyke, multiDykeUid } = item;
  let baseItem =
    !multiDyke && multiDykeUid
      ? order.items.find(
          (a) => a.multiDyke && multiDykeUid == a.multiDykeUid
        ) || item
      : item;
  // item.deliverables = [];
  const itemControlUid = door
    ? doorItemControlUid(door.id, door.dimension)
    : hpt
      ? mouldingItemControlUid(item.id, hpt?.id)
      : itemItemControlUid(item.id);
  const deliverables = order.assignments
    .map((a) =>
      a.submissions
        .map((s) => {
          const submissionQty = transformQtyHandle(s);
          const dispatchQty = qtyMatrixSum(
            ...order.deliveries
              .map((d) =>
                d.items
                  .filter((di) => di.orderProductionSubmissionId === s.id)
                  .map((b) => transformQtyHandle(b))
              )
              .flat()
          );
          const pendingQty = qtyMatrixDifference(submissionQty, dispatchQty);
          if (hasQty(pendingQty) && a.salesItemControlUid === itemControlUid)
            return {
              submissionId: s.id,
              qty: pendingQty,
            };
          return null;
        })
        .filter((a) => a?.submissionId)
        .map((a) => a!)
        .flat()
    )
    .flat()!;
  const prodOverride = doorMeta?.prodOverride;
  const itemConfig = getItemStatConfig({
    isDyke: !!order.isDyke,
    formSteps: baseItem.formSteps,
    setting: setting.data,
    dykeProduction: baseItem.dykeProduction,
    swing: baseItem.swing,
    prodOverride,
  });

  const composed = {
    salesId: order.id,
    title,
    sectionTitle,
    controlUid: itemControlUid,
    qty,
    hptId: hpt?.id,
    prodOverride,
    configs,
    itemIndex,
    itemId: item.id,
    unitCost: door ? door.unitPrice! : item.rate!,
    totalCost: door ? door.lineTotal! : item.total!,
    swing: door?.swing!,
    noHandle: qty.noHandle,
    unitLabor,
    doorId: door?.id,
    dim: door?.dimension,
    size: door?.dimension,
    itemConfig,
    deliverables,
    shelfId: null,
  };
  const analytics = composeSalesItemControlStat({
    order,
    ...(composed as any),
  });
  const hands = assignedToId
    ? analytics.stats?.prodAssigned
    : analytics?.stats?.qty;
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

  const subtitle = [
    composed.sectionTitle,
    composed.size,
    composed.swing,
    handTitle,
    assignedToId
      ? null
      : composed.unitLabor
        ? `$ ${formatCurrency(composed.unitLabor)}/qty labor`
        : `no labor cost`,
  ]
    ?.filter(Boolean)
    .join(" | ");

  return {
    ...composed,
    subtitle,
    analytics,
    hands,
  };
}
export async function getSaleInformation(
  //   ctx: TRPCContext,
  db: Db,
  params: GetFullSalesDataSchema
) {
  const data = await salesInformationData(db, params);
  const { order } = data;

  let items = order.items
    .map((item) => {
      const { multiDyke, multiDykeUid } = item;

      let baseItem =
        !multiDyke && multiDykeUid
          ? order.items.find(
              (a) => a.multiDyke && multiDykeUid == a.multiDykeUid
            ) || item
          : item;

      const itemIndex = (item.meta as any as SalesItemMeta)?.lineIndex;
      const hpt = item.housePackageTool;
      const doors = hpt?.doors;
      let controlUid;
      let { configs, sectionTitle } = composeStepFormDisplay(
        item.formSteps,
        item.dykeDescription
      );
      if (!order.isDyke || (!doors?.length && !hpt?.door)) {
        return [composeSalesItemControl(data, item)];
      }
      if (doors?.length) {
        return doors.map((door) => composeSalesItemControl(data, item, door));
      }
      return [];
    })
    .flat()
    .map((item) => item!);
  items = items.sort((a, b) => a.itemIndex! - b.itemIndex!);
  // order.deliveries.
  await Promise.all(
    items.map(async (item) => {
      if (item.analytics?.assignmentUidUpdates?.length)
        await db.orderItemProductionAssignments.updateMany({
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
  // let orderRequiresUpdate = //= {};
  //   // items?.map((item) => {
  //   //   const stats = item.analytics?.stats;
  //   //   const totalDeliverableQty = sum(item.deliverables?.map((a) => a.qty.qty));
  //   //   const totalQty = stats?.qty.qty;
  //   //   const packedQty = stats?.dispatchAssigned.qty;
  //   //   if (
  //   //     !item.itemConfig?.production &&
  //   //     totalQty &&
  //   //     totalQty != packedQty &&
  //   //     totalDeliverableQty < totalQty - packedQty
  //   //   ) {
  //   //     // orderRequiresUpdate = true;
  //   //   }
  //   //   return {
  //   //     totalDeliverableQty,
  //   //     totalQty,
  //   //     packedQty,
  //   //     production: item.itemConfig?.production,
  //   //   };
  //   // });
  return {
    items,
    orderNo: order.orderId,
    orderId: order.id,
    deliveries: order.deliveries,
    order,
    orderMeta: order.meta as any as SalesMeta,
    // orderRequiresUpdate,
    // order
  };
}
