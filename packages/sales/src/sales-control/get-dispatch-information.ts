import { sum } from "@gnd/utils";
import { Db, ItemControlData, SalesDispatchStatus } from "../types";
import { getSaleInformation } from "./get-sale-information";
import {
  laborRate,
  qtyMatrixDifference,
  qtyMatrixSum,
} from "../utils/sales-control";
import { padStart } from "lodash";

function isControlDebugEnabled() {
  const flag = String(process.env.CONTROL_DEBUG ?? "")
    .trim()
    .toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes" || flag === "on";
}

function controlDebugLog(label: string, payload: Record<string, unknown>) {
  if (!isControlDebugEnabled()) return;
}

export async function getSalesDispatchOverview(db: Db, { salesId, salesNo }) {
  //   throw new Error("ERRORR!");
  const overview = await getSaleInformation(db, {
    salesId,
    salesNo,
  });
  const availableDispatchQty = sum(
    overview.items.map((item) => item?.analytics?.dispatch.available.qty),
  );
  const pendingDispatchQty = sum(
    overview.items.map((item) => item?.analytics?.dispatch.pending?.qty),
  );
  const dispatchedQty = sum(
    overview.items.map((item) => item?.analytics?.deliveredQty),
  );
  const pendingProductionQty =
    sum(
      overview.items
        ?.filter((a) => a.itemConfig?.production)
        .map((item) => item.analytics?.production?.pending?.qty),
    ) +
    sum(
      overview.items
        ?.filter((a) => a.itemConfig?.production)
        .map((item) => item.analytics?.assignment?.pending?.qty),
    );
  const dispatchables = overview.items.map((item) => {
    // if (!item.analytics) return;
    item.analytics = item.analytics as NonNullable<
      ItemControlData["analytics"]
    >;
    const currentDispatchQty = qtyMatrixSum(
      item.analytics.stats.dispatchAssigned,
      item.analytics.stats.dispatchCompleted,
      item.analytics.stats.dispatchInProgress,
    );
    const dispatchStat = item.analytics.deliverables;

    return {
      uid: item.controlUid,
      title: item.title,
      img: item.img,

      itemId: item.itemId,
      unitLabor: laborRate(
        overview?.orderMeta?.laborConfig?.rate,
        item.unitLabor,
      ),
      deliverables: item.deliverables,
      totalQty: item.qty,
      doorId: item.doorId,
      dispatchStat,
      itemConfig: item.itemConfig,
      analytics: item.analytics,
      pendingSubmissions: item.analytics?.pendingSubmissions,
      subtitle: [item.sectionTitle, item.size, item.swing]
        .filter(Boolean)
        .join(" | "),
      availableQty: qtyMatrixDifference(
        item.itemConfig?.production
          ? item.analytics.stats.prodCompleted
          : item.analytics.stats.qty,
        currentDispatchQty,
      ),
    };
  });

  controlDebugLog("getSalesDispatchOverview.dispatchables", {
    salesId: overview.order.id,
    dispatchableCount: dispatchables.length,
    progress: {
      availableDispatchQty,
      dispatchedQty,
      pendingDispatchQty,
      pendingProductionQty,
    },
    dispatchables: dispatchables.map((item) => ({
      uid: item.uid,
      itemId: item.itemId,
      production: !!item.itemConfig?.production,
      totalQty: item.totalQty,
      availableQty: item.availableQty,
      deliverableCount: (item.deliverables || []).length,
      submissionCount: (item.analytics?.submissionIds || []).length,
      dispatchStats: item.analytics?.stats
        ? {
            dispatchAssigned: item.analytics.stats.dispatchAssigned,
            dispatchInProgress: item.analytics.stats.dispatchInProgress,
            dispatchCompleted: item.analytics.stats.dispatchCompleted,
          }
        : null,
    })),
  });

  const deliveries = overview.deliveries.map((delivery) => {
    return {
      ...delivery,
      status: delivery.status as SalesDispatchStatus,
      dispatchNumber: `DISP-${padStart(delivery.id?.toString(), 5, "0")}`,
      items: delivery.items.map((item) => {
        const _item = overview.items.find((i) =>
          i?.analytics?.submissionIds.includes(
            item.orderProductionSubmissionId!,
          ),
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
    // orderRequiresUpdate: overview.orderRequiresUpdate,
    progress: {
      availableDispatchQty,
      dispatchedQty,
      pendingDispatchQty,
      pendingProductionQty,
    },
  };
}
