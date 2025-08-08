import { Db } from "@gnd/db";
import { CUSTOMER_TRANSACTION_TYPES, CustomerTransactionType } from "./types";
import { z } from "zod";
import {
  CustomerTransanctionStatus,
  SALES_PAYMENT_METHODS,
  SalesPaymentStatus,
} from "./constants";
import { calculateSalesDueAmount } from "./sales-transaction";

export async function getCustomerWallet(db: Db, accountNo) {
  const wallet = await db.customerWallet.upsert({
    where: {
      accountNo,
    },
    update: {},
    create: {
      balance: 0,
      accountNo,
    },
  });
  const debit = await db.customerTransaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      walletId: wallet?.id,
      type: "pay-with-wallet" as CustomerTransactionType,
      status: "success",
    },
  });
  const balance = await db.customerTransaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      walletId: wallet?.id,
      type: "wallet" as CustomerTransactionType,
      status: "success",
    },
  });
  const walletBalance = balance._sum.amount! - debit._sum.amount!;
  return {
    id: wallet.id,
    balance: walletBalance,
    accountNo,
  };
}
export const salesPayWithWalletSchema = z.object({
  accountNo: z.string(),
  salesIds: z.array(z.number()),
  authorId: z.number().optional().nullable(),
});
export type SalesPayWithWallet = z.infer<typeof salesPayWithWalletSchema>;
export async function salesPayWithWallet(db: Db, data: SalesPayWithWallet) {
  // create wallet charge.
  const wallet = await getCustomerWallet(db, data.accountNo);

  await db.$transaction(async (tx) => {
    const sales = await tx.salesOrders.findMany({
      where: {
        id: {
          in: data.salesIds,
        },
      },
      select: {
        id: true,
        amountDue: true,
      },
    });
    let walletBalance = wallet.balance!;

    for (const sale of sales) {
      if (walletBalance > 0) {
        let amount =
          sale.amountDue! > walletBalance ? walletBalance : sale.amountDue!;
        walletBalance -= amount;
        await applySalesPayment(tx as any, {
          amount: amount!,
          authorId: data.authorId!,
          paymentMethod: "wallet",
          salesId: sale.id,
          walletId: wallet.id,
          transactionType: "pay-with-wallet",
        });
      }
    }
  }, {});
}
export const applySalesPaymentSchema = z.object({
  salesId: z.number(),
  walletId: z.number(),
  amount: z.number(),
  paymentMethod: z.enum(SALES_PAYMENT_METHODS),
  transactionType: z.enum(CUSTOMER_TRANSACTION_TYPES),
  checkNo: z.string().optional().nullable(),
  authorId: z.number(),
  squarePaymentId: z.string().optional().nullable(),
});
export type ApplySalesPayment = z.infer<typeof applySalesPaymentSchema>;

async function applySalesPayment(db: Db, data: ApplySalesPayment) {
  const __tx = await db.customerTransaction.create({
    data: {
      amount: data.amount,
      wallet: {
        connect: {
          id: data.walletId,
        },
      },
      paymentMethod: data.paymentMethod,
      status: "success" as any as CustomerTransanctionStatus,
      meta: {
        checkNo: data.checkNo,
      },
      type: data.transactionType,
      author: {
        connect: {
          id: data.authorId,
        },
      },
      squarePayment: data.squarePaymentId
        ? {
            connect: {
              id: data.squarePaymentId!,
            },
          }
        : undefined,
      salesPayments: {
        create: {
          meta: {
            checkNo: data.checkNo,
          },
          amount: data.amount,
          status: "success" as SalesPaymentStatus,
          orderId: data.salesId,
          squarePaymentsId: data.squarePaymentId,
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
  await calculateSalesDueAmount(db, data.salesId);
}
