import type { Db, TransactionClient } from "@gnd/db";
import { buildSalesPaymentRefundedNotificationEvent } from "../contracts";
import { mirrorLegacyRefundSalesPayment } from "../infrastructure";

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
	const transaction = await db.customerTransaction.update({
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
					order: {
						select: {
							customerId: true,
							orderId: true,
							customer: {
								select: {
									name: true,
									businessName: true,
								},
							},
							billingAddress: {
								select: {
									name: true,
								},
							},
							salesRep: {
								select: {
									email: true,
									id: true,
								},
							},
						},
					},
				},
			},
		},
	});
	const salesPayment = transaction.salesPayments[0];
	if (salesPayment) {
		await mirrorLegacyRefundSalesPayment(db, {
			amount: -1 * input.refundAmount,
			customerTransactionId: input.transactionId,
			salesId: input.orderId,
			salesPaymentId: salesPayment.id,
			walletId: transaction.wallet?.id,
		});
	}
	const events =
		salesPayment?.order?.salesRep?.id != null
			? [
					buildSalesPaymentRefundedNotificationEvent({
						amount: input.refundAmount,
						reason: input.reason,
						seed: {
							customerId: salesPayment.order.customerId,
							customerName:
								salesPayment.order.customer?.businessName ||
								salesPayment.order.customer?.name ||
								salesPayment.order.billingAddress?.name ||
								undefined,
							orderNo: salesPayment.order.orderId,
							salesRepEmail: salesPayment.order.salesRep.email,
							salesRepId: salesPayment.order.salesRep.id,
						},
					}),
				]
			: [];
	return {
		...transaction,
		events,
	};
}
