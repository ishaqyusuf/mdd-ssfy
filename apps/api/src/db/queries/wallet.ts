import type { TRPCContext } from "@api/trpc/init";
import { z } from "zod";
import { getAuthUser } from "./user";
import type {
  CustomerTransanctionStatus,
  SalesPaymentStatus,
} from "@sales/constants";
import type { CustomerTransactionType } from "@sales/types";
import { updateSalesDueAmount } from "./sales";

export const resolvePaymentSchema = z.object({
  transactionId: z.number(),
  action: z.enum(["cancel", "refund"]),
  refundAmount: z.number().optional().nullable(),
  refundMethod: z.enum(["wallet", "cash", "other"]),
  refundMode: z.enum(["full", "part"]),
  reason: z.string(),
  note: z.string().optional().nullable(),
});
export type ResolvePayment = z.infer<typeof resolvePaymentSchema>;

export async function resolvePayment(ctx: TRPCContext, data: ResolvePayment) {
  const { db } = ctx;
  const user = await getAuthUser(ctx);
  return await db.$transaction(async (prisma) => {
    let walletId, orderId;
    if (
      data.action == "cancel" ||
      (data.action == "refund" && data.refundMode == "full")
    ) {
      const tx = await prisma.customerTransaction.update({
        where: {
          id: data.transactionId,
        },
        data: {
          status: "CANCELED" as any,
          statusNote: data.note,
          statusReason: data.reason,
          history: {
            create: {
              status: "CANCELED",
              description: data.note,
              reason: `${data.reason}${
                data.action == "refund" ? ` | refund: ${data.refundMethod}` : ""
              }`,
              authorId: ctx.userId,
              authorName: user.name,
            },
          },
          salesPayments: {
            updateMany: {
              where: {
                deletedAt: null,
              },
              data: {
                status: "cancelled" as SalesPaymentStatus,
              },
            },
          },
        },
        select: {
          wallet: {
            select: {
              id: true,
            },
          },
          salesPayments: {
            select: {
              orderId: true,
              id: true,
            },
          },
        },
      });
      walletId = tx.wallet?.id!;
      orderId = tx?.salesPayments?.[0]?.orderId!;
    }
    if (!walletId && data.action == "refund" && data.refundMode == "part") {
      const tx = await prisma.customerTransaction.update({
        where: {
          id: data.transactionId,
        },
        data: {
          history: {
            create: {
              status: data.refundMode,
              description: data.note,
              reason: `${data.reason}${
                data.action == "refund"
                  ? ` | refund: ${data.refundMethod} | $${data.refundAmount}`
                  : ""
              }`,
              authorId: ctx.userId,
              authorName: user.name,
            },
          },
          // salesPayments: {
          //   updateMany: {
          //     where: {
          //       deletedAt: null,
          //     },
          //     data: {
          //       status: "cancelled" as SalesPaymentStatus,
          //     },
          //   },
          // },
        },
        select: {
          wallet: {
            select: {
              id: true,
            },
          },
          salesPayments: {
            select: {
              orderId: true,
              id: true,
            },
          },
        },
      });
      walletId = tx.wallet?.id!;
      const sp = tx.salesPayments?.[0]!;
      orderId = sp.orderId!;
    }

    if (data.reason == "refund-wallet" || data.action == "refund") {
      if (!walletId) throw new Error("Unable to process, invalid wallet!");
      if (!data.refundAmount) throw new Error("Invalid Refund Process");

      const refundTx = await prisma.customerTransaction.create({
        data: {
          amount: data.refundAmount!,
          status: "success" as SalesPaymentStatus,
          type: "wallet" as CustomerTransactionType,
          description: data.note,
          statusReason: data.reason,
          walletId,
        },
      });
      if (data.refundMode == "part") {
        await prisma.salesPayments.create({
          data: {
            order: {
              connect: {
                id: orderId,
              },
            },
            amount: -1 * data.refundAmount!,
            status: "success" as SalesPaymentStatus,
            transaction: {
              connect: {
                id: refundTx.id,
              },
            },
          },
        });
      }
      if (orderId) {
        await updateSalesDueAmount(orderId, prisma);
        //  await deleteSalesCommission(sp?.id);
        //  await createSiteActionTicket({
        //    type: "sales-payment",
        //    event: "cancelled",
        //    meta: {
        //      id: sp.id,
        //    },
        //  });
        await createResolution(
          {
            ...ctx,
            db: prisma as any,
          },
          {
            action: data.action as any,
            reason: data.reason as any,
            salesId: orderId,
          }
        );
      }
    }
  });
}

export const createResolutionSchema = z.object({
  salesId: z.number(),
  action: z.string(),
  reason: z.string(),
});
export type CreateResolution = z.infer<typeof createResolutionSchema>;
export async function createResolution(
  ctx: TRPCContext,
  data: CreateResolution
) {
  const { db } = ctx;
  const auth = await getAuthUser(ctx);
  const s = await db.salesResolution.create({
    data: {
      salesId: data.salesId,
      action: data.action,
      resolvedBy: auth.name!,
      reason: data.reason,
    },
  });
}
export const getCustomerWalletSchema = z.object({
  accountNo: z.string(),
});
export type GetCustomerWallet = z.infer<typeof getCustomerWalletSchema>;
export async function getCustomerWallet(
  ctx: TRPCContext,
  data: GetCustomerWallet
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
