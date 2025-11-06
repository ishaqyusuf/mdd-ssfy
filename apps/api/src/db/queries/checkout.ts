import type { TRPCContext } from "@api/trpc/init";
import { generateRandomString, timeout } from "@gnd/utils";
import {
  tokenSchemas,
  validateToken,
  type SalesPaymentTokenSchema,
} from "@gnd/utils/tokenizer";
import z from "zod";
import { getOrders } from "./sales";
import type { SalesPaymentMethods } from "@sales/constants";
import type { SquarePaymentStatus } from "./sales-accounting";
import type { CustomerTransactionType } from "@sales/types";

export const initializeCheckoutSchema = z.object({
  token: z.string(),
});
export type InitializeCheckoutSchema = z.infer<typeof initializeCheckoutSchema>;

export async function initializeCheckout(
  ctx: TRPCContext,
  query: InitializeCheckoutSchema
) {
  const { db } = ctx;
  const payload = validateToken(
    query.token,
    tokenSchemas.salesPaymentTokenSchema
  );
  const sales = await getOrders(ctx, {
    salesIds: payload?.salesIds,
    // invoice: "pending",
  });
  await timeout(1000);

  return {
    payload: payload!,
    sales: sales?.data?.filter((a) => a.due > 0),
    customerName: sales?.data?.[0]?.displayName,
  };
}

export const createSalesCheckoutLinkSchema = z.object({
  token: z.string(),
});
export type CreateSalesCheckoutLinkSchema = z.infer<
  typeof createSalesCheckoutLinkSchema
>;

export async function createSalesCheckoutLink(
  ctx: TRPCContext,
  data: CreateSalesCheckoutLinkSchema
) {
  const { db } = ctx;
  const checkoutData = await initializeCheckout(ctx, {
    token: data.token,
  });
  const payload = checkoutData.payload;

  return db.$transaction(async (tx) => {
    const accountNo = checkoutData?.sales
      ?.map((a) => a.customerPhone)
      ?.filter(Boolean)?.[0]!;
    let phoneNo = accountNo?.replaceAll("-", "");
    if (!phoneNo?.startsWith("+")) phoneNo = `+1${phoneNo}`;

    const ct = await tx.customerTransaction.create({
      data: {
        wallet: {
          connectOrCreate: {
            where: {
              accountNo,
            },
            create: {
              balance: 0,
              accountNo,
            },
          },
        },
        amount: payload.amount!,
        paymentMethod: "link" as SalesPaymentMethods,
        squarePayment: {
          create: {
            status: "PENDING" as SquarePaymentStatus,
            paymentId: generateRandomString(),
            // amount: totalAmount,
            orders: {
              createMany: {
                data: checkoutData.sales.map((order) => ({
                  orderId: order.id,
                })),
              },
            },
            amount: payload?.amount!,
            paymentMethod: "link" as SalesPaymentMethods,
            tip: 0,
            checkout: {
              create: {
                paymentType: "link" as SalesPaymentMethods,
              },
            },
          },
        },
        type: "transaction" as CustomerTransactionType,
        description: "",
        status: "PENDING" as SquarePaymentStatus,
      },
      include: {
        squarePayment: {
          include: {
            checkout: true,
            orders: true,
          },
        },
      },
    });
    // const redirectUrl = `${getBaseUrl()}/square-payment/${emailToken}/${orderIdsParam}/payment-response/${
    //   tx.squarePayment?.paymentId
    // }`;
  });
}
