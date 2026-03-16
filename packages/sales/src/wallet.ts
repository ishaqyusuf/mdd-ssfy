import type { Db, TransactionClient } from "@gnd/db";
import { z } from "zod";
import {
	type CustomerTransanctionStatus,
	SALES_PAYMENT_METHODS,
	type SalesPaymentStatus,
} from "./constants";
import { recordLegacySalesPayment } from "./payment-system";
import {
	CUSTOMER_TRANSACTION_TYPES,
	type CustomerTransactionType,
} from "./types";

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
	const walletBalance = (balance._sum.amount || 0) - (debit._sum.amount || 0);
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
		let walletBalance = wallet.balance || 0;

		for (const sale of sales) {
			if (walletBalance > 0) {
				const amountDue = sale.amountDue || 0;
				const amount = amountDue > walletBalance ? walletBalance : amountDue;
				walletBalance -= amount;
				await applySalesPayment(tx, {
					amount,
					authorId: data.authorId || 0,
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

async function applySalesPayment(
	db: Db | TransactionClient,
	data: ApplySalesPayment,
) {
	await recordLegacySalesPayment(db, {
		amount: data.amount,
		authorId: data.authorId,
		walletId: data.walletId,
		paymentMethod: data.paymentMethod,
		salesId: data.salesId,
		transactionType: data.transactionType,
		checkNo: data.checkNo,
		squarePaymentId: data.squarePaymentId,
		transactionStatus: "success" as CustomerTransanctionStatus,
		paymentStatus: "success" as SalesPaymentStatus,
	});
}
