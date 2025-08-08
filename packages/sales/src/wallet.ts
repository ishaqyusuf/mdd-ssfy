import { Db } from "@gnd/db";
import { CustomerTransactionType } from "./types";
import { z } from "zod";

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
  const balance = await db.customerTransaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      walletId: wallet?.id,
      //   OR: [
      // {
      type: "wallet" as CustomerTransactionType,
      status: "success", // as SquarePaymentStatus,
      // },
      //   ],
    },
  });
  const walletBalance = balance._sum.amount;
  return {
    id: wallet.id,
    balance: walletBalance,
  };
}
export const salesPayWithWalletSchema = z.object({
  walletId: z.number(),
  salesIds: z.array(z.number()),
});
export type SalesPayWithWallet = z.infer<typeof salesPayWithWalletSchema>;
export async function salesPayWithWallet(db: Db, data: SalesPayWithWallet) {
  // create wallet charge.
}
