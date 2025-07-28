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
} from "../utils/sales-control";
import { formatCurrency } from "@gnd/utils";

export async function getSaleInformation(
  //   ctx: TRPCContext,
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
