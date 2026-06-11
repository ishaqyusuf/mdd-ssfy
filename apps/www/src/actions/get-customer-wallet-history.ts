"use server";

import { prisma } from "@/db";
import { sum } from "@gnd/utils";

type WalletTxType = "wallet" | "pay-with-wallet" | string | null;

function toMoney(value: unknown) {
	const amount = Number(value || 0);
	return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function formatOrderIds(ids: string[]) {
	return ids.join(", ").replace(/,([^,]*)$/, " &$1");
}

function getWalletActivityLabel(args: {
	type: WalletTxType;
	amount: number;
	description?: string | null;
	meta?: Record<string, unknown> | null;
}) {
	if (args.type === "pay-with-wallet") return "Wallet payment";
	if (args.meta?.source === "sales-overpayment") return "Overpayment credit";
	if (args.description?.toLowerCase().includes("refund")) return "Wallet refund";
	if (args.amount < 0) return "Wallet debit";
	return "Wallet credit";
}

export async function getCustomerWalletHistoryAction(accountNo?: string | null) {
	if (!accountNo) {
		return {
			balance: 0,
			data: [],
		};
	}

	const wallet = await prisma.customerWallet.findUnique({
		where: {
			accountNo,
		},
		select: {
			id: true,
			accountNo: true,
		},
	});

	if (!wallet) {
		return {
			balance: 0,
			data: [],
		};
	}

	const transactions = await prisma.customerTransaction.findMany({
		where: {
			walletId: wallet.id,
			type: {
				in: ["wallet", "pay-with-wallet"],
			},
			status: "success",
		},
		orderBy: {
			createdAt: "asc",
		},
		select: {
			id: true,
			amount: true,
			createdAt: true,
			description: true,
			meta: true,
			paymentMethod: true,
			status: true,
			type: true,
			author: {
				select: {
					name: true,
				},
			},
			salesPayments: {
				where: {
					deletedAt: null,
				},
				select: {
					amount: true,
					order: {
						select: {
							id: true,
							orderId: true,
						},
					},
				},
			},
		},
	});

	let runningBalance = 0;
	const data = transactions.map((transaction) => {
		const amount = toMoney(transaction.amount);
		const meta = (transaction.meta || {}) as Record<string, unknown>;
		const isDebit = transaction.type === "pay-with-wallet" || amount < 0;
		const creditAmount = isDebit ? 0 : Math.abs(amount);
		const debitAmount = isDebit ? Math.abs(amount) : 0;
		const signedAmount = creditAmount - debitAmount;
		runningBalance = toMoney(runningBalance + signedAmount);
		const appliedOrderIds = transaction.salesPayments
			.map((payment) => payment.order?.orderId)
			.filter(Boolean) as string[];
		const selectedSalesIds = Array.isArray(meta.selectedSalesIds)
			? meta.selectedSalesIds
			: [];
		const selectedOrderIds = Array.isArray(meta.selectedOrderIds)
			? (meta.selectedOrderIds.filter(Boolean) as string[])
			: [];
		const sourceLabel =
			meta.source === "sales-overpayment" && selectedOrderIds.length
				? `Overpayment from invoice ${formatOrderIds(selectedOrderIds)}`
				: meta.source === "sales-overpayment" && selectedSalesIds.length
					? `Overpayment from selected sales ${selectedSalesIds.join(", ")}`
					: (meta.source as string | undefined) ||
						transaction.description ||
						null;
		const applicationTotal = toMoney(sum(transaction.salesPayments, "amount"));

		return {
			id: transaction.id,
			paymentNo: transaction.id.toString().padStart(5, "0"),
			createdAt: transaction.createdAt,
			activity: getWalletActivityLabel({
				amount,
				description: transaction.description,
				meta,
				type: transaction.type,
			}),
			type: transaction.type,
			status: transaction.status,
			paymentMethod: transaction.paymentMethod,
			description: transaction.description,
			creditAmount,
			debitAmount,
			amount: signedAmount,
			runningBalance,
			source: sourceLabel,
			appliedTo: appliedOrderIds.length ? formatOrderIds(appliedOrderIds) : null,
			applications: transaction.salesPayments.map((payment) => ({
				amount: toMoney(payment.amount),
				orderId: payment.order?.orderId || null,
				salesId: payment.order?.id || null,
			})),
			applicationTotal,
			authorName: transaction.author?.name || null,
			meta,
			isExactTrail: transaction.type === "pay-with-wallet",
		};
	});

	return {
		balance: toMoney(runningBalance),
		data: data.reverse(),
	};
}
