import type { TRPCContext } from "@api/trpc/init";
import { generateRandomString, timeout } from "@gnd/utils";
import { tokenize, tokenSchemas, validateToken } from "@gnd/utils/tokenizer";
import z from "zod";
import { getOrders } from "./sales";
import type { SalesPaymentMethods } from "@sales/constants";
import type { SquarePaymentStatus } from "./sales-accounting";
import type { CustomerTransactionType } from "@sales/types";
import { getAppUrl } from "@gnd/utils/envs";
import { SQUARE_LOCATION_ID, squareClient } from "@gnd/square";
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
    const sales = checkoutData?.sales;

    const cust = sales.find((a) => !!a.email && !!a.displayName);
    const accountNo = sales?.map((a) => a.accountNo)?.filter(Boolean)?.[0]!;
    const phone = checkoutData?.sales
      ?.map((a) => a.customerPhone)
      ?.filter(Boolean)?.[0]!;
    let phoneNo = phone?.replaceAll("-", "");
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
    const token = tokenize({
      ...payload,
      paymentId: ct?.squarePayment?.id,
    });
    const redirectUrl = `${getAppUrl()}/checkout/${token}`;
    try {
      const resp = await squareClient.checkout.paymentLinks.create({
        idempotencyKey: new Date().toISOString(),
        quickPay: {
          locationId: SQUARE_LOCATION_ID!,
          name: squareSalesNote(checkoutData.sales.map((a) => a.orderId)),
          priceMoney: {
            amount: BigInt(Math.round(payload.amount! * 100)),
            currency: "USD",
          },
        },
        prePopulatedData: {
          buyerEmail: cust?.email!,
          buyerPhoneNumber: phoneNo,
          buyerAddress: {
            addressLine1: cust?.address,
          },
        },
        checkoutOptions: {
          redirectUrl,
          askForShippingAddress: false,
          allowTipping: false,
        },
      });

      // const paymentId = tx.squarePayment.paymentId;
      // const { result, statusCode, body: _body } = resp;
      const { paymentLink } = resp;
      await tx.squarePayments.update({
        where: {
          id: ct?.squarePayment?.id,
        },
        data: {
          squareOrderId: paymentLink?.orderId,
        },
      });
      // const paymentLink = result.paymentLink;
      return {
        paymentLink: paymentLink?.url,
      };
    } catch (error) {
      if (error instanceof Error) throw new Error(error.message);
    }
  });
}

export function squareSalesNote(orderIds: string[]) {
  return `sales payment for order${
    orderIds.length > 1 ? "s" : ""
  } ${orderIds.join(", ")}`;
}

export const verifyPaymentSchema = z.object({
  paymentId: z.string(),
  attempts: z.number().default(1).optional().nullable(),
});
export type VerifyPaymentSchema = z.infer<typeof verifyPaymentSchema>;

export async function verifyPayment(
  ctx: TRPCContext,
  query: VerifyPaymentSchema
) {
  const { db } = ctx;
  return db.$transaction(async (tx) => {
    const squarePayment = await tx.squarePayments.findFirstOrThrow({
      where: {
        id: query.paymentId,
      },
      include: {
        checkout: {
          include: {
            order: true,
            tenders: true,
          },
        },
      },
    });
    const checkout = squarePayment.checkout;
    // const meta = checkout?.meta as any;
    // const {
    //     result: {
    //         order: { id: orderId, tenders },
    //     },
    // } = await squareClient.ordersApi.retrieveOrder(meta.squareOrderId);
    const { errors, order } = await squareClient.orders.get({
      orderId: squarePayment.squareOrderId!,
    });
    const tenders = order!.tenders;
    const resp: { amount; tip; status: SquarePaymentStatus } = {
      amount: 0,
      tip: null,
      status: null as any,
    };

    await Promise.all(
      tenders!.map(async (tender) => {
        // const {
        //     result: { payment },
        // } = await squareClient.paymentsApi.getPayment(tender.paymentId);
        const payment = (
          await squareClient.payments.get({
            paymentId: tender.paymentId!,
          })
        )?.payment!;
        //   payment.payment.tim
        const tip = payment.tipMoney?.amount;
        resp.status = payment.status as any;
        if (resp.status == "COMPLETED") {
          resp.amount += Number(payment.amountMoney!.amount) / 100;
          let t = Number(tip);
          resp.tip = t > 0 ? t / 100 : 0;
        }
        await tx.checkoutTenders.create({
          data: {
            salesCheckoutId: checkout!.id,
            // squareOrderId: orderId,

            status: resp.status,
            tenderId: tender.id!,
            // squarePaymentId: payment.id,
          },
        });
      })
    );
    // checkout?.amount
    if (resp.amount > 0)
      await paymentSuccess({ ...checkout, tip: resp.tip } as any, tx);
    return resp;
  });
}
export async function paymentSuccess(
  p: {
    amount;
    orderId;
    tip;
    order: { customerId; amountDue };
    id;
  },
  tx
) {
  const _p = await tx.salesPayments.create({
    data: {
      // transactionId: 1,
      amount: p.amount,
      orderId: p.orderId,
      tip: p.tip,
      meta: {},
      status: "success",
      // customerId: p.order.customerId,
    },
  });
  await tx.salesCheckout.update({
    where: {
      id: p.id,
    },
    data: {
      tip: p.tip,
      status: "success" as any,
      salesPaymentsId: _p.id,
    },
  });
  let amountDue = p.order.amountDue - p.amount;
  await tx.salesOrders.update({
    where: {
      id: p.orderId,
    },
    data: {
      amountDue,
    },
  });
}
