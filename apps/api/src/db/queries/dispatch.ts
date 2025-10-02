import { whereDispatch } from "@api/prisma-where";
import { composeQueryData } from "@gnd/utils/query-response";
import type {
  DispatchQueryParamsSchema,
  SalesDispatchOverviewSchema,
  UpdateSalesDeliveryOptionSchema,
} from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import type { QtyControlType } from "@api/type";
import type { Prisma } from "@gnd/db";
import type { SalesDispatchStatus } from "@gnd/utils/constants";

import { qtyMatrixSum, transformQtyHandle } from "@sales/utils/sales-control";
import { getSalesDispatchOverview } from "@sales/exports";
import { qtyMatrixDifference, recomposeQty } from "@sales/utils/sales-control";

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

export async function getDispatchOverview(
  ctx: TRPCContext,
  query: SalesDispatchOverviewSchema
) {
  const result = await getSalesDispatchOverview(ctx.db, {
    salesId: query.salesId,
    salesNo: query.salesNo,
  });

  const dispatch = result.deliveries.find((d) => d.id === query.dispatchId);
  let address = result.order.shippingAddress;
  if (!address) address = {} as any;
  const order = result.order;
  return {
    dispatch,
    dispatchItems: result.order.itemControls.map((item) => {
      const listedItems = dispatch?.items.filter(
        (a) => a.item?.controlUid == item.uid
      );
      const totalListedQty = recomposeQty(
        qtyMatrixSum(
          ...result.deliveries
            .map((d) =>
              d.items
                .filter((i) => i.item.controlUid === item.uid)
                .map(transformQtyHandle)
                .flat()
            )
            .flat()
        )
      );
      const trs = listedItems?.map(transformQtyHandle);
      const listedQty = qtyMatrixSum(...(trs || ([] as any)));

      const dispatchable = result.dispatchables.find((d) => d.uid === item.uid);
      const deliverableQty = recomposeQty(
        qtyMatrixSum(...(dispatchable?.deliverables?.map((a) => a.qty) || []))
      );
      const nonDeliverableQty = recomposeQty(
        qtyMatrixDifference(
          dispatchable?.totalQty!,
          qtyMatrixSum(deliverableQty, totalListedQty)
        )
      );
      let packingHistory = listedItems?.map((a) => ({
        qty: transformQtyHandle(a),
        date: a.createdAt,
        note: "",
        packedBy: a.packedBy,
        id: a.id,
        packingUid: a.packingUid,
      }))!;
      packingHistory = packingHistory
        .filter(
          (p, o) =>
            !p.packingUid ||
            (p.packingUid &&
              packingHistory?.findIndex((a) => a.packingUid === p.packingUid) ==
                o)
        )
        .map((d) => ({
          ...d,
          qty: !d.packingUid
            ? d.qty
            : qtyMatrixSum(
                ...packingHistory?.filter((p) => p.packingUid === d.packingUid)!
              ),
        }));
      return {
        title: item.title,
        sectionTitle: item.sectionTitle,
        subtitle: dispatchable?.subtitle,
        uid: item.uid,
        deliverables: dispatchable?.deliverables,
        deliverableQty,
        dispatchable,
        listedQty,
        nonDeliverableQty,
        // availableQty,
        // pendingQty,
        // listedQty,
        totalQty: dispatchable?.totalQty!,
        // dispatchable,
        salesItemId: dispatchable?.itemId,
        packingHistory,
        // itemConfig: item.produceable
      };
    }),
    address: address || ({} as any),
    // scheduleDate: dispatch?.dueDate,
    order: {
      orderId: order.orderId,
      date: order.createdAt,
      id: order.id,
    },
    // orderRequiresUpdate: result.orderRequiresUpdate,
  };
}

export async function enlistItemToForDispatch(ctx: TRPCContext) {
  //
}
