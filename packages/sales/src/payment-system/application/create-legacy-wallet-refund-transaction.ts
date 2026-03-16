import type { Db, TransactionClient } from "@gnd/db";

export interface CreateLegacyWalletRefundTransactionInput {
	walletId: number;
	refundAmount: number;
	refundMethod: string;
	note?: string | null;
	reason: string;
}

export async function createLegacyWalletRefundTransaction(
	db: Db | TransactionClient,
	input: CreateLegacyWalletRefundTransactionInput,
) {
	return db.customerTransaction.create({
		data: {
			amount: input.refundAmount,
			status: "success",
			type: input.refundMethod === "wallet" ? "wallet" : "transaction",
			description: input.note,
			statusReason: input.reason,
			walletId: input.walletId,
		},
	});
}
