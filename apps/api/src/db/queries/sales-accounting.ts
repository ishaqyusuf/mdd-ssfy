import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { formatMoney, sum } from "@gnd/utils";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import {
  SALES_PAYMENT_METHODS,
  salesHaving,
  type CustomerTransactionMeta,
  type SalesPaymentMethods,
} from "@sales/constants";
import type { SalesPaymentMeta, SalesType } from "@sales/types";
import { z } from "zod";
import { padStart } from "lodash";

export const getSalesAccountingsSchema = z
  .object({
    customerTransactionId: z.number().optional().nullable(),
    orderNo: z.string().optional().nullable(),
    accountNo: z.string().optional().nullable(),
    status: z.enum(["Success", "Cancelled"]).optional().nullable(),
    paymentType: z.enum(SALES_PAYMENT_METHODS).optional().nullable(),
    salesRepId: z.number().optional().nullable(),
    dateRange: z.array(z.string().optional().nullable()).optional().nullable(),
    payments: z.enum(salesHaving).optional().nullable(),
    d: z.boolean().optional().nullable(),
  })
  .merge(paginationSchema);
export type GetSalesAccountingsSchema = z.infer<
  typeof getSalesAccountingsSchema
>;

export async function getSalesAccountings(
  ctx: TRPCContext,
  query: GetSalesAccountingsSchema
) {
  const { db } = ctx;
  const model = db.customerTransaction;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereSalesAccountings(query),
    model
  );

  const data = await model.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
      statusNote: true,
      amount: true,
      createdAt: true,
      description: true,
      status: true,
      paymentMethod: true,
      meta: true,

      history: {
        select: {
          id: true,
          authorName: true,
          status: true,
          createdAt: true,
          description: true,
          reason: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      author: {
        select: {
          name: true,
          id: true,
        },
      },
      wallet: {
        select: {
          accountNo: true,
        },
      },
      salesPayments: {
        where: {
          deletedAt: null,
          order: {
            type: "order" as SalesType,
          },
        },
        select: {
          amount: true,
          status: true,
          meta: true,
          squarePayments: {
            select: {
              paymentId: true,
            },
          },
          order: {
            select: {
              subTotal: true,
              orderId: true,
              id: true,
              grandTotal: true,
              extraCosts: {
                where: {
                  type: {
                    in: ["Labor", "Delivery"],
                  },
                },
                select: {
                  type: true,
                  amount: true,
                },
              },
              salesRep: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return await response(
    data.map((item) => {
      const amount =
        item.salesPayments?.length > 0
          ? sum(item.salesPayments.map((a) => a.amount))
          : formatMoney(Math.abs(item.amount));
      const orderIds = item.salesPayments.map((a) => a.order.orderId);
      const orderIdsString = orderIds.join(", ").replace(/,([^,]*)$/, " &$1");

      const paymentMethod = item.paymentMethod as SalesPaymentMethods;
      const description = item.description;
      const salesReps = Array.from(
        new Set(item.salesPayments?.map((s) => s.order?.salesRep?.name))
      );
      const meta = (item.meta || {}) as any as CustomerTransactionMeta;
      const spMeta = item.salesPayments?.[0]?.meta as any as SalesPaymentMeta;
      // meta.checkNo
      const spStatus = item?.salesPayments?.[0]?.status;
      let status = item.status;
      if (paymentMethod == "link" && status?.toLocaleLowerCase() == "pending")
        status = spStatus!;
      const { history } = item;
      const orderCount = orderIds?.length;
      const order = item?.salesPayments?.[0]?.order;
      const ordersCount = item?.salesPayments?.length;
      const multiSales = ordersCount > 1;
      const squarePaymentId =
        item?.salesPayments?.[0]?.squarePayments?.paymentId;
      const laborCost = order?.extraCosts?.find(
        (a) => a.type == "Labor"
      )?.amount;
      const deliveryCost = order?.extraCosts?.find(
        (a) => a.type == "Delivery"
      )?.amount;
      return {
        checkNo: meta?.checkNo || spMeta?.checkNo,
        reason: item?.history?.[0]?.reason,
        uuid: item.id,
        id: item.id,
        paymentNo: padStart(item.id?.toString(), 5, "0"),
        authorName: item.author?.name,
        status,
        // status: ,
        createdAt: item.createdAt,
        amount,
        paymentMethod,
        description,
        ordersCount,
        orderIds: orderIdsString,
        salesReps,
        sales: item.salesPayments,
        meta,
        history,
        laborCost,
        deliveryCost,
        grandTotal: order?.grandTotal,
        subTotal: order?.subTotal,
        squarePaymentId,
      };
    })
  );
}
export type SquarePaymentStatus =
  | "APPROVED"
  | "PENDING"
  | "COMPLETED"
  | "CANCELED"
  | "FAILED";
function whereSalesAccountings(query: GetSalesAccountingsSchema) {
  const where: Prisma.CustomerTransactionWhereInput[] = [
    {
      OR: [
        {
          status: {
            in: [
              "success",
              "cancelled",
              "canceled",
            ] as any as SquarePaymentStatus[],
          },
          paymentMethod: {
            not: null,
          },
          salesPayments: { some: {} },
        },
        // {
        //     AND: [
        //         // { type: {} },
        //         { type: "transaction" as CustomerTransactionType },
        //         {
        //             amount: {
        //                 gt: 0,
        //             },
        //         },
        //         { salesPayments: { some: {} } },
        //     ],
        // },
        {
          paymentMethod: "link" as SalesPaymentMethods,
          amount: {
            gt: 0,
          },
          salesPayments: {
            some: {},
          },
        },
      ],
    },
  ];
  for (const [k, _v] of Object.entries(query)) {
    let v = _v as any;
    if (!v) continue;
    switch (k as keyof GetSalesAccountingsSchema) {
      case "q":
        where.push(whereSearch(v));
        break;
      case "customerTransactionId":
        where.push({
          id: v,
        });
        break;
      case "accountNo":
        where.push({
          wallet: {
            accountNo: v,
          },
        });
        break;
      case "orderNo":
        where.push({
          salesPayments: {
            some: {
              order: {
                orderId: {
                  in: v?.split(","),
                },
              },
            },
          },
        });
        break;
    }
  }
  return composeQuery(where);
}
function whereSearch(query) {
  const inputQ = { contains: query || undefined } as any;
  return {
    //
    salesPayments: {
      some: {
        order: {
          OR: [
            { orderId: inputQ },
            {
              customer: {
                OR: [
                  {
                    businessName: inputQ,
                  },
                  {
                    name: inputQ,
                  },
                  {
                    email: inputQ,
                  },
                  {
                    phoneNo: inputQ,
                  },
                ],
              },
            },
          ],
        },
      },
    },
  } satisfies Prisma.CustomerTransactionWhereInput;
}
