import { Db, SalesDispatchStatus } from "@/types";

import { RenturnTypeAsync } from "@gnd/utils";
import { getSalesSetting } from "./settings";

export type GetSalesItemControllables = RenturnTypeAsync<
  typeof getSalesItemControllablesInfoAction
>;
export async function getSalesItemControllablesInfoAction(
  //   ctx: TRPCContext,
  prisma: Db,
  salesId
) {
  //   const prisma = ctx.db;
  const order = await prisma.salesOrders.findFirstOrThrow({
    where: { id: salesId },
    select: {
      id: true,
      isDyke: true,
      itemControls: {
        where: { deletedAt: null },
        include: {
          qtyControls: true,
        },
      },
      stat: true,
      deliveries: {
        where: { deletedAt: null },
        select: {
          id: true,
          status: true,
        },
      },
      assignments: {
        where: { deletedAt: null },
        select: {
          lhQty: true,
          rhQty: true,
          qtyAssigned: true,
          itemId: true,
          salesDoorId: true,
          submissions: {
            where: { deletedAt: null },
            select: {
              deletedAt: true,
              qty: true,
              rhQty: true,
              lhQty: true,
              itemDeliveries: {
                where: { deletedAt: null },
                select: {
                  status: true,
                  orderDeliveryId: true,
                  qty: true,
                  lhQty: true,
                  rhQty: true,
                },
              },
            },
          },
        },
      },
      items: {
        where: { deletedAt: null },
        select: {
          multiDykeUid: true,
          dykeProduction: true,
          swing: true,
          qty: true,
          id: true,
          description: true,
          dykeDescription: true,
          formSteps: {
            where: {
              step: {
                title: "Item Type",
              },
            },
            select: {
              prodUid: true,
              value: true,
              // step: {
              //     select: { uid: true, meta: true },
              // },
            },
          },
          housePackageTool: {
            where: { deletedAt: null },
            select: {
              stepProduct: {
                where: { deletedAt: null },
                select: {
                  name: true,
                  product: {
                    where: { deletedAt: null },
                    select: {
                      title: true,
                    },
                  },
                  door: {
                    where: { deletedAt: null },
                    select: {
                      title: true,
                    },
                  },
                },
              },
              molding: {
                where: { deletedAt: null },
                select: {
                  title: true,
                },
              },
              door: {
                where: { deletedAt: null },
                select: {
                  title: true,
                },
              },
              id: true,
              moldingId: true,
              doors: {
                where: { deletedAt: null },
                select: {
                  dimension: true,
                  id: true,
                  lhQty: true,
                  rhQty: true,
                  totalQty: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const setting = await getSalesSetting(prisma);
  const groupConfig = {};
  return {
    ...order,
    // setting,
    deliveries: order.deliveries.map((d) => {
      return {
        ...d,
        status: d.status as SalesDispatchStatus,
      };
    }),
    items: order.items.map((item) => {
      const mainStep = item.formSteps?.[0];
      const stepConfigUid = mainStep?.prodUid;
      let config =
        setting?.data?.route?.[stepConfigUid!]?.config ||
        groupConfig?.[item.multiDykeUid!];
      if (config) groupConfig[item.multiDykeUid!] = config;
      const isService = mainStep?.value?.toLowerCase() == "services";
      return {
        ...item,
        itemStatConfig: order.isDyke
          ? {
              production: isService ? item.dykeProduction : config?.production,
              shipping: config?.shipping,
            }
          : {
              production: item.qty && item.swing,
              shipping: !!item.qty,
            },
      };
    }),
    assignments: order.assignments.map((a) => {
      return {
        ...a,
        submissions: a.submissions.map((s) => {
          return {
            ...s,
            itemDeliveries: s.itemDeliveries
              .filter((s) =>
                order.deliveries.some((a) => a.id == s.orderDeliveryId)
              )
              .map((d) => {
                return {
                  ...d,
                  status: d.status as SalesDispatchStatus,
                };
              }),
          };
        }),
      };
    }),
  };
}
