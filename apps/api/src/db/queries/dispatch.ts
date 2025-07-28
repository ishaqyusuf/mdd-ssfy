import { whereDispatch } from "@api/prisma-where";
import { composeQueryData } from "@api/query-response";
import type {
  DispatchQueryParamsSchema,
  SalesDispatchOverviewSchema,
  UpdateSalesDeliveryOptionSchema,
} from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import type { ItemControlData, QtyControlType } from "@api/type";
import type { Prisma } from "@gnd/db";
import type { SalesDispatchStatus } from "@gnd/utils/constants";
import { getSalesLifeCycle } from "./sales";
import { sum } from "@gnd/utils";
import {
  laborRate,
  qtyMatrixDifference,
  qtyMatrixSum,
  transformQtyHandle,
} from "@api/utils/sales-control";
import { padStart } from "lodash";

export async function getDispatches(
  ctx: TRPCContext,
  query: DispatchQueryParamsSchema
) {
  const { db } = ctx;
  query.sort = "dueDate,createdAt";
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereDispatch(query),
    db.orderDelivery
  );
  const data = await db.orderDelivery.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
      status: true,
      createdAt: true,
      dueDate: true,
      deliveryMode: true,
      order: {
        select: {
          stat: {
            where: {
              type: "dispatchCompleted" as QtyControlType,
              deletedAt: null,
            },
            select: {
              percentage: true,
            },
          },
          createdAt: true,
          orderId: true,
          id: true,
          customer: {
            select: {
              name: true,
              businessName: true,
              phoneNo: true,
            },
          },
          shippingAddress: {
            select: {
              name: true,
              phoneNo: true,
            },
          },
        },
      },
      driver: {
        select: {
          name: true,
        },
      },
    },
  });

  return await response(
    data.map((a) => {
      return {
        ...a,
        uid: String(a.id),
      };
    })
  );
}

export async function getSalesDeliveryInfo(ctx: TRPCContext, salesId) {
  const sale = await ctx.db.salesOrders.findFirstOrThrow({
    where: {
      id: salesId,
      type: "order",
    },
    select: {
      id: true,
      deliveryOption: true,
      deliveries: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          deliveryMode: true,
          dueDate: true,
          status: true,
        },
      },
    },
  });
  return sale;
}
export async function updateSalesDeliveryOption(
  ctx: TRPCContext,
  data: UpdateSalesDeliveryOptionSchema
) {
  if (data.option && !data.deliveryId) {
    await ctx.db.salesOrders.update({
      where: { id: data.salesId },
      data: {
        deliveryOption: data.option,
      },
    });
    return;
  }
  if (!data.deliveryId) {
    data.deliveryId = (
      await ctx.db.orderDelivery.create({
        data: {
          deliveryMode: data.option || data.defaultOption || "delivery",
          createdBy: {},
          driver: data.driverId
            ? {
                connect: {
                  id: data.driverId,
                },
              }
            : undefined,
          status: data.status || ("queue" as SalesDispatchStatus),
          dueDate: data.date,
          meta: {},
          order: {
            connect: { id: data.salesId },
          },
        },
      })
    ).id;
  } else {
    const updateData: Prisma.OrderDeliveryUpdateInput = {};
    Object.entries(data).map(([k, v]) => {
      const value = v as any;
      if (value === undefined) return;
      switch (k as keyof UpdateSalesDeliveryOptionSchema) {
        case "date":
          updateData.dueDate = value;
          break;
        case "driverId":
          updateData.driver = {
            connect: {
              id: value,
            },
          };
          break;
        case "option":
          updateData.deliveryMode = value;
          break;
        case "status":
          updateData.status = value;
          break;
      }
    });
    await ctx.db.orderDelivery.update({
      where: {
        id: data.deliveryId,
      },
      data: updateData,
    });
  }
}
export async function getSalesDispatchOverview(
  ctx: TRPCContext,
  { salesId, salesNo, driverId }: SalesDispatchOverviewSchema
) {
  const overview = await getSalesLifeCycle(ctx, { salesId, salesNo });
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
    delivery.driver;
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
    progress: {
      availableDispatchQty,
      dispatchedQty,
      pendingDispatchQty,
      pendingProductionQty,
    },
  };
}
export async function getDispatchOverview(
  ctx: TRPCContext,
  query: SalesDispatchOverviewSchema
) {
  const result = await getSalesDispatchOverview(ctx, query);
  const dispatch = result.deliveries.find((d) => d.id === query.dispatchId);
  const address = result.order.shippingAddress;
  const order = result.order;
  return {
    dispatch,
    dispatchItems: result.order.itemControls.map((item) => {
      const listedItems = dispatch?.items.filter(
        (a) => a.item?.controlUid == item.uid
      );
      const trs = listedItems?.map(transformQtyHandle);
      const listedQty = qtyMatrixSum(trs ? trs : ([] as any));

      const dispatchable = result.dispatchables.find((d) => d.uid === item.uid);
      const pendingQty = dispatchable?.analytics.dispatch.pending;
      const availableQty = dispatchable?.availableQty!;
      const totalQty = qtyMatrixSum([
        availableQty,
        listedQty,
        ...(dispatchable?.pendingSubmissions?.map((a) => a.qty) || []),
      ] as any);

      return {
        title: item.title,
        sectionTitle: item.sectionTitle,
        subtitle: dispatchable?.subtitle,
        uid: item.uid,
        availableQty,
        pendingQty,
        listedQty,
        totalQty,
        dispatchable,
        salesItemId: dispatchable?.itemId,
        packingHistory: listedItems?.map((a) => ({
          qty: a.qty,
          date: a.createdAt,
          note: "",
          packedBy: "me",
        })),
      };
    }),
    address,
    // scheduleDate: dispatch?.dueDate,
    order: {
      orderId: order.orderId,
      date: order.createdAt,
      id: order.id,
    },
  };
}

export async function enlistItemToForDispatch(ctx: TRPCContext) {
  //
}
