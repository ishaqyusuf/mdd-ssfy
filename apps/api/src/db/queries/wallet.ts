import type { TRPCContext } from "@api/trpc/init";
import { sendPaymentSystemNotifications } from "@gnd/notifications/payment-system";
import {
  appendLegacyRefundSalesPayment,
  cancelLegacyCustomerTransaction,
  createLegacyWalletRefundTransaction,
  repairLegacySalesPaymentBalance,
} from "@gnd/sales/payment-system";
import { createLegacySalesResolution } from "@gnd/sales/resolution-system";
import { squareCreateRefund } from "@gnd/square";
import type { CustomerTransanctionStatus } from "@sales/constants";
import { resolvePaymentSchema, type ResolvePayment } from "@sales/schema";
import type { CustomerTransactionType } from "@sales/types";
import { tasks } from "@trigger.dev/sdk/v3";
import { getAuthUser } from "./user";
import z from "zod";
export { resolvePaymentSchema,  };

export async function resolvePayment(ctx: TRPCContext, data: ResolvePayment) {
  const { db } = ctx;
  const user = await getAuthUser(ctx);
  return await db.$transaction(async (prisma) => {
    let walletId: number | undefined;
    let orderId: number | undefined;

    if (
      data.action === "cancel"
      // ||
      // (data.action == "refund" && data.refundMode == "full")
    ) {
      const tx = await cancelLegacyCustomerTransaction(prisma, {
        transactionId: data.transactionId,
        note: data.note,
        reason: data.reason,
        authorId: ctx.userId,
        authorName: user.name,
      });
      walletId = tx.wallet?.id;
      orderId = tx.salesPayments?.[0]?.orderId;
    }
    if (data.action === "refund") {
      orderId = (
        await prisma.customerTransaction.findUniqueOrThrow({
          where: {
            id: data.transactionId,
          },
          select: {
            salesPayments: {
              select: {
                order: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        })
      ).salesPayments?.[0]?.order?.id;
      if (!orderId || !data.refundAmount) {
        throw new Error("Invalid refund context");
      }
      const tx = await appendLegacyRefundSalesPayment(prisma, {
        transactionId: data.transactionId,
        orderId,
        refundAmount: data.refundAmount,
        refundMode: data.refundMode,
        reason: `${data.reason} | refund: ${data.refundMethod}`,
        note: data.note,
        authorId: ctx.userId,
        authorName: user.name,
      });
      if (tx.events?.length) {
        await sendPaymentSystemNotifications(tasks, ctx, tx.events);
      }
      walletId = tx.wallet?.id;
      const sp = tx.salesPayments?.[0];
      orderId = sp?.orderId;
    }
    if (
      data.refundMethod === "terminal" ||
      data.refundMethod === "credit-card"
    ) {
      await squareCreateRefund({
        author: (await getAuthUser(ctx))?.name || "",
        amount: data.refundAmount || 0,
        reason: data.reason,
        squarePaymentId: data.squarePaymentId || "",
        tx: prisma,
        note: "",
      });
    }
    if (
      data.reason === "refund-wallet" ||
      data.action === "refund" ||
      (data.action === "cancel" && data.paymentMethod === "wallet")
    ) {
      if (!walletId) throw new Error("Unable to process, invalid wallet!");
      if (!data.refundAmount) throw new Error("Invalid Refund Process");

      await createLegacyWalletRefundTransaction(prisma, {
        walletId,
        refundAmount: data.refundAmount,
        refundMethod: data.refundMethod,
        note: data.note,
        reason: data.reason,
      });
      if (orderId) {
        await repairLegacySalesPaymentBalance(prisma, {
          salesId: orderId,
        });
        await createLegacySalesResolution(prisma, {
          action: data.action,
          reason: data.reason,
          salesId: orderId,
          resolvedBy: user.name || "",
        });
      }
    }
  });
}

const createResolutionSchema = z.object({
  salesId: z.number(),
  action: z.string(),
  reason: z.string(),
});
type CreateResolution = z.infer<typeof createResolutionSchema>;
async function createResolution(
  ctx: TRPCContext,
  data: CreateResolution,
) {
  const { db } = ctx;
  const auth = await getAuthUser(ctx);
  return createLegacySalesResolution(db, {
    salesId: data.salesId,
    action: data.action,
    resolvedBy: auth.name || "",
    reason: data.reason,
  });
}
const getCustomerWalletSchema = z.object({
  accountNo: z.string(),
});
type GetCustomerWallet = z.infer<typeof getCustomerWalletSchema>;
async function getCustomerWallet(
  ctx: TRPCContext,
  data: GetCustomerWallet,
) {
  const { db } = ctx;
  const accountNo = data.accountNo;
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
      OR: [
        {
          type: "wallet" as CustomerTransactionType,
          status: {
            in: ["success"] as CustomerTransanctionStatus[],
          },
        },
      ],
    },
  });
  const walletBalance = balance._sum.amount;
  return {
    ...wallet,
    walletBalance,
  };
}

const payWithWalletSchema = z.object({
  salesIds: z.array(z.number()),
  walletId: z.number(),
  accountNo: z.string(),
});
type PayWithWallet = z.infer<typeof payWithWalletSchema>;

async function payWithWallet(ctx: TRPCContext, data: PayWithWallet) {
  const { db } = ctx;
  const wallet = await getCustomerWallet(ctx, {
    accountNo: data.accountNo,
  });
}
