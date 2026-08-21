import type { Db, TransactionClient } from "@gnd/db";
import { mirrorLegacyWalletCreditTransaction } from "../infrastructure";

export interface CreateLegacyWalletCreditTransactionInput {
	walletId: number;
	amount: number;
	paymentMethod?: string | null;
	note?: string | null;
	reason: string;
	authorId?: number | null;
	squarePaymentId?: string | null;
	meta?: Record<string, unknown> | null;
	occurredAt?: Date | null;
}

export async function createLegacyWalletCreditTransaction(
	db: Db | TransactionClient,
	input: CreateLegacyWalletCreditTransactionInput,
) {
	const transaction = await db.customerTransaction.create({
		data: {
			amount: input.amount,
			createdAt: input.occurredAt || undefined,
			status: "success",
			type: "wallet",
			description: input.note,
			statusReason: input.reason,
			paymentMethod: input.paymentMethod || undefined,
			meta: input.meta || undefined,
			wallet: {
				connect: {
					id: input.walletId,
				},
			},
			author:
				input.authorId != null
					? {
							connect: {
								id: input.authorId,
							},
						}
					: undefined,
			squarePayment: input.squarePaymentId
				? {
						connect: {
							id: input.squarePaymentId,
						},
					}
				: undefined,
		},
	});

	await mirrorLegacyWalletCreditTransaction(db, {
		amount: input.amount,
		customerTransactionId: transaction.id,
		occurredAt: input.occurredAt,
		meta: input.meta,
		reason: input.reason,
		walletId: input.walletId,
	});

	return transaction;
}
