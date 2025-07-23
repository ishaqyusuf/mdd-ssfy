import { whereDispatch } from "@api/prisma-where";
import { composeQueryData } from "@api/query-response";
import type {
  DispatchQueryParamsSchema,
  SalesDispatchOverviewSchema,
  UpdateSalesDeliveryOptionSchema,
} from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import type { QtyControlType, SalesMeta, SalesType } from "@api/type";
import { SalesIncludeAll, SalesListInclude } from "@api/utils/sales";
import type { Prisma } from "@gnd/db";
import type { SalesDispatchStatus } from "@gnd/utils/constants";
import { getSalesSetting } from "./settings";

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
  { salesId, driverId }: SalesDispatchOverviewSchema
) {
  let include = SalesIncludeAll;
  const order = await ctx.db.salesOrders.findFirstOrThrow({
    where: {
      id: salesId,
      type: "order" as SalesType,
    },
    include,
  });
  const setting = await getSalesSetting(ctx);
  const meta: SalesMeta = order.meta as any;
}
