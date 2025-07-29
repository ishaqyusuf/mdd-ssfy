import { sum } from "@gnd/utils";
import { Db, ItemControlData } from "../types";
import { getSaleInformation } from "./get-sale-information";
import {
  laborRate,
  qtyMatrixDifference,
  qtyMatrixSum,
} from "../utils/sales-control";
import { padStart } from "lodash";

export async function getSalesDispatchOverview(db: Db, { salesId, salesNo }) {
  //   throw new Error("ERRORR!");
  const overview = await getSaleInformation(db, {
    salesId,
    salesNo,
  });
  const availableDispatchQty = sum(
    overview.items.map((item) => item?.analytics?.dispatch.available.qty)
  );
  const pendingDispatchQty = sum(
    overview.items.map((item) => item?.analytics?.dispatch.pending?.qty)
  );
  const dispatchedQty = sum(
    overview.items.map((item) => item?.analytics?.deliveredQty)
  );
  const pendingProductionQty =
    sum(
      overview.items
        ?.filter((a) => a.itemConfig?.production)
        .map((item) => item.analytics?.production?.pending?.qty)
    ) +
    sum(
      overview.items
        ?.filter((a) => a.itemConfig?.production)
        .map((item) => item.analytics?.assignment?.pending?.qty)
    );
  const dispatchables = overview.items.map((item) => {
    // if (!item.analytics) return;
    item.analytics = item.analytics as NonNullable<
      ItemControlData["analytics"]
    >;
    const currentDispatchQty = qtyMatrixSum(
      item.analytics.stats.dispatchAssigned,
      item.analytics.stats.dispatchCompleted,
      item.analytics.stats.dispatchInProgress
    );
    const dispatchStat = item.analytics.deliverables;
    return {
      uid: item.controlUid,
      title: item.title,

      itemId: item.itemId,
      unitLabor: laborRate(
        overview?.orderMeta?.laborConfig?.rate,
        item.unitLabor
      ),
      deliverables: item.deliverables,
      totalQty: item.qty.qty,
      doorId: item.doorId,
      dispatchStat,
      analytics: item.analytics,
      pendingSubmissions: item.analytics?.pendingSubmissions,
      subtitle: [item.sectionTitle, item.size, item.swing]
        .filter(Boolean)
        .join(" | "),
      availableQty: qtyMatrixDifference(
        item.itemConfig?.production
          ? item.analytics.stats.prodCompleted
          : item.analytics.stats.qty,
        currentDispatchQty
      ),
    };
  });
  const deliveries = overview.deliveries.map((delivery) => {
    return {
      ...delivery,
      dispatchNumber: `DISP-${padStart(delivery.id?.toString(), 5, "0")}`,
      items: delivery.items.map((item) => {
        const _item = overview.items.find((i) =>
          i?.analytics?.submissionIds.includes(
            item.orderProductionSubmissionId!
          )
        );
        const { controlUid, title, sectionTitle, subtitle } = _item || {};
        return {
          ...item,
          item: {
            controlUid,
            title,
            sectionTitle,
            subtitle,
          },
        };
      }),
    };
  });
  return {
    id: overview.orderId,
    orderUid: overview.orderNo,
    dispatchables,
    deliveries,
    order: overview.order,
    orderRequiresUpdate: overview.orderRequiresUpdate,
    progress: {
      availableDispatchQty,
      dispatchedQty,
      pendingDispatchQty,
      pendingProductionQty,
    },
  };
}
