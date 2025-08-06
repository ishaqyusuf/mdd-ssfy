import type { TRPCContext } from "@api/trpc/init";
import { z } from "zod";

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
  return await db.$transaction(async (prisma) => {});
}
