import type { Db, TransactionClient } from "@gnd/db";
import { mirrorCancelledLegacyCustomerTransaction } from "../infrastructure";

export interface CancelLegacyCustomerTransactionInput {
	transactionId: number;
	note?: string | null;
	reason: string;
	authorId?: number | null;
	authorName?: string | null;
}

export async function cancelLegacyCustomerTransaction(
	db: Db | TransactionClient,
	input: CancelLegacyCustomerTransactionInput,
) {
	const transaction = await db.customerTransaction.update({
		where: {
			id: input.transactionId,
		},
		data: {
			status: "CANCELED",
			statusNote: input.note,
			statusReason: input.reason,
			history: {
				create: {
					status: "CANCELED",
					description: input.note,
					reason: input.reason,
					authorId: input.authorId || 0,
					authorName: input.authorName || "",
				},
			},
			salesPayments: {
				updateMany: {
					where: {
						deletedAt: null,
					},
					data: {
						status: "cancelled",
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
	await mirrorCancelledLegacyCustomerTransaction(db, {
		customerTransactionId: input.transactionId,
	});
	return transaction;
}
