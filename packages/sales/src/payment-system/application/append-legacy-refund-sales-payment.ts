import type { Db, TransactionClient } from "@gnd/db";

export interface AppendLegacyRefundSalesPaymentInput {
	transactionId: number;
	orderId: number;
	refundAmount: number;
	refundMode: string;
	reason: string;
	note?: string | null;
	authorId?: number | null;
	authorName?: string | null;
}

export async function appendLegacyRefundSalesPayment(
	db: Db | TransactionClient,
	input: AppendLegacyRefundSalesPaymentInput,
) {
	return db.customerTransaction.update({
		where: {
			id: input.transactionId,
		},
		data: {
			history: {
				create: {
					status: input.refundMode,
					description: input.note,
					reason: `${input.reason} | refund: $${input.refundAmount}`,
					authorId: input.authorId || 0,
					authorName: input.authorName || "",
				},
			},
			salesPayments: {
				create: {
					order: {
						connect: {
							id: input.orderId,
						},
					},
					amount: -1 * input.refundAmount,
					status: "success",
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
}
