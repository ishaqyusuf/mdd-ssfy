import type { TRPCContext } from "@api/trpc/init";
import { consoleLog, generateRandomString, timeout } from "@gnd/utils";
import { tokenize, tokenSchemas, validateToken } from "@gnd/utils/tokenizer";
import z from "zod";
import { createPayrollAction, getOrders, updateSalesDueAmount } from "./sales";
import type {
  CustomerTransanctionStatus,
  SalesPaymentMethods,
  SalesPaymentStatus,
} from "@sales/constants";
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
    const squarePayment = await tx.squarePayments.create({
      data: {
        status: "PENDING" as SquarePaymentStatus,
        paymentId: generateRandomString(),
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
            orderId: checkoutData?.sales?.[0]?.id,
            paymentType: "link" as SalesPaymentMethods,
            amount: payload?.amount!,
          },
        },
      },
    });
    // const ct = await tx.customerTransaction.create({
    //   data: {
    //     wallet: {
    //       connectOrCreate: {
    //         where: {
    //           accountNo,
    //         },
    //         create: {
    //           balance: 0,
    //           accountNo,
    //         },
    //       },
    //     },
    //     amount: payload.amount!,
    //     paymentMethod: "link" as SalesPaymentMethods,
    //     squarePayment: {
    //       create: {
    //         status: "PENDING" as SquarePaymentStatus,
    //         paymentId: generateRandomString(),
    //         // amount: totalAmount,
    //         orders: {
    //           createMany: {
    //             data: checkoutData.sales.map((order) => ({
    //               orderId: order.id,
    //             })),
    //           },
    //         },
    //         amount: payload?.amount!,
    //         paymentMethod: "link" as SalesPaymentMethods,
    //         tip: 0,
    //         checkout: {
    //           create: {
    //             orderId: checkoutData?.sales?.[0]?.id,
    //             paymentType: "link" as SalesPaymentMethods,
    //             amount: payload?.amount!,
    //           },
    //         },
    //       },
    //     },
    //     type: "transaction" as CustomerTransactionType,
    //     description: "",
    //     status: "PENDING" as SquarePaymentStatus,
    //   },
    //   include: {
    //     squarePayment: {
    //       include: {
    //         checkout: true,
    //         orders: true,
    //       },
    //     },
    //   },
    // });
    const token = tokenize({
      ...payload,
      paymentId: squarePayment?.id,
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
          id: squarePayment?.id,
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
  walletId: z.number(),
  attempts: z.number().default(1).optional().nullable(),
});
export type VerifyPaymentSchema = z.infer<typeof verifyPaymentSchema>;

export async function verifyPayment(
  ctx: TRPCContext,
  query: VerifyPaymentSchema
) {
  if (query.attempts! > 2)
    return {
      status: "error",
    };
  const { db } = ctx;
  return db.$transaction(async (tx) => {
    const squarePayment = await tx.squarePayments.findFirstOrThrow({
      where: {
        id: query.paymentId,
      },
      include: {
        orders: {
          select: {
            order: {
              select: {
                amountDue: true,
                id: true,
                customerId: true,
                salesRepId: true,
              },
            },
          },
        },
        checkout: {
          include: {
            // order: true,
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

    if (resp.amount > 0)
      await paymentSuccess(
        {
          // ...checkout,
          walletId: query.walletId,
          checkoutId: checkout!.id,
          squarePaymentId: squarePayment.id,
          orders: squarePayment?.orders
            ?.map((a) => a.order!)
            .map((a) => ({
              ...a,
            })), //.[0]?.order,
          tip: resp.tip,
          // amount: checkout?.amount || squarePayment.amount,
          amount: resp.amount,
        },
        tx
      );
    return resp;
  });
}
export async function paymentSuccess(
  p: {
    squarePaymentId;
    walletId;
    amount;
    tip;
    orders: { id; customerId; amountDue; salesRepId }[];
    checkoutId;
  },
  tx
) {
  let balance = p.amount;
  for (const order of p.orders) {
    let payAmount = balance > order.amountDue ? order.amountDue : balance;
    balance -= payAmount;
    const __tx = await tx.customerTransaction.create({
      data: {
        amount: payAmount,
        wallet: {
          connect: {
            id: p.walletId,
          },
        },
        paymentMethod: "link" as SalesPaymentMethods,
        status: "success" as any as CustomerTransanctionStatus,
        meta: {},
        type: "transaction" as CustomerTransactionType,
        // author: {
        //   connect: {
        //     id: await authId(),
        //   },
        // },
        squarePayment: {
          connect: {
            id: p?.squarePaymentId,
          },
        },
        salesPayments: {
          create: {
            meta: {
              // checkNo: props.checkNo,
            },
            amount: payAmount,
            status: "success" as SalesPaymentStatus,
            orderId: order.id,
            squarePaymentsId: p?.squarePaymentId,
            // props.terminalPaymentSession?.squarePaymentId,
          },
        },
      },
      select: {
        salesPayments: {
          select: {
            id: true,
            amount: true,
            order: {
              select: {
                salesRepId: true,
                id: true,
                orderId: true,
              },
            },
          },
        },
      },
    });
    const [sp] = __tx.salesPayments;
    await updateSalesDueAmount(order.id, tx);
    await createPayrollAction(
      {
        orderId: order.id,
        userId: order.salesRepId,
        salesPaymentId: sp.id,
        salesAmount: sp.amount,
      },
      tx
    );
  }

  await tx.salesCheckout.update({
    where: {
      id: p.checkoutId,
    },
    data: {
      tip: p.tip,
      status: "success" as any,
      // salesPaymentsId: _p.id,
    },
  });
}

/*

*/
export const generateDeviceCodeSchema = z.object({
  // : z.string(),
});
export type GenerateDeviceCodeSchema = z.infer<typeof generateDeviceCodeSchema>;

export async function generateDeviceCode(
  ctx: TRPCContext,
  query: GenerateDeviceCodeSchema
) {
  const { db } = ctx;
  const resp = await squareClient.devices.codes.create({
    idempotencyKey: generateRandomString(),

    deviceCode: {
      locationId: process.env.SQUARE_LOCATION_ID,
      productType: "TERMINAL_API",
      name: "GND-MILLWORK-1451",
    },
  });
  return resp?.deviceCode;
}
