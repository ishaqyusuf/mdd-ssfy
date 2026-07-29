import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import {
	type SalesFinanceTransaction,
	type SalesFinanceTransactionSource,
	addMoney,
	projectSalesFinanceTransaction,
	summarizeSalesFinanceTransactions,
} from "@gnd/sales/payment-system";
import { endOfDay, isValid, parse, startOfDay, subDays } from "date-fns";

import type {
	SalesFinanceFiltersInput,
	SalesFinanceSummaryInput,
	SalesFinanceTransactionsInput,
} from "../../schemas/sales-finance";

const DATE_ONLY_FORMAT = "yyyy-MM-dd";

const salesFinanceTransactionSelect = {
	id: true,
	txId: true,
	status: true,
	statusNote: true,
	amount: true,
	paymentMethod: true,
	description: true,
	meta: true,
	createdAt: true,
	author: {
		select: {
			name: true,
			email: true,
		},
	},
	wallet: {
		select: {
			accountNo: true,
			customer: {
				select: {
					id: true,
					businessName: true,
					name: true,
				},
			},
		},
	},
	squarePayment: {
		select: {
			paymentId: true,
			squareOrderId: true,
			paymentMethod: true,
			status: true,
			amount: true,
			tip: true,
			createdBy: {
				select: {
					name: true,
					email: true,
				},
			},
		},
	},
	refundTx: {
		where: {
			deletedAt: null,
		},
		select: {
			refund: {
				select: {
					id: true,
					refId: true,
					total: true,
					status: true,
				},
			},
		},
	},
	salesPayments: {
		where: {
			deletedAt: null,
			order: {
				type: "order",
			},
		},
		select: {
			id: true,
			amount: true,
			status: true,
			note: true,
			meta: true,
			createdAt: true,
			order: {
				select: {
					id: true,
					orderId: true,
					customer: {
						select: {
							id: true,
							businessName: true,
							name: true,
						},
					},
					billingAddress: {
						select: {
							name: true,
						},
					},
					salesRep: {
						select: {
							name: true,
							email: true,
						},
					},
				},
			},
		},
	},
} satisfies Prisma.CustomerTransactionSelect;

function parseDateOnly(value?: string | null) {
	if (!value) return null;
	const parsed = parse(value, DATE_ONLY_FORMAT, new Date());
	return isValid(parsed) ? parsed : null;
}

function resolveDateRange(filters: SalesFinanceFiltersInput) {
	const today = new Date();
	const from = parseDateOnly(filters.from) || subDays(today, 29);
	const to = parseDateOnly(filters.to) || today;

	return {
		from: startOfDay(from),
		to: endOfDay(to),
	};
}

function buildSalesFinanceWhere(
	filters: SalesFinanceFiltersInput,
): Prisma.CustomerTransactionWhereInput {
	const { from, to } = resolveDateRange(filters);
	const q = filters.q?.trim();
	const salesRepIds = filters.salesRepIds?.filter(Boolean) || [];
	const customerIds = filters.customerIds?.filter(Boolean) || [];

	return {
		deletedAt: null,
		createdAt: {
			gte: from,
			lte: to,
		},
		AND: [
			{
				OR: [
					{
						salesPayments: {
							some: {
								deletedAt: null,
								order: {
									type: "order",
								},
							},
						},
					},
					{ squarePayment: { isNot: null } },
					{ refundTx: { some: { deletedAt: null } } },
				],
			},
			...(q
				? [
						{
							OR: [
								{ txId: { contains: q } },
								{ description: { contains: q } },
								{
									wallet: {
										is: {
											customer: {
												is: {
													OR: [
														{ businessName: { contains: q } },
														{ name: { contains: q } },
													],
												},
											},
										},
									},
								},
								{
									salesPayments: {
										some: {
											deletedAt: null,
											order: {
												OR: [
													{ orderId: { contains: q } },
													{
														customer: {
															is: {
																OR: [
																	{ businessName: { contains: q } },
																	{ name: { contains: q } },
																],
															},
														},
													},
												],
											},
										},
									},
								},
							],
						} satisfies Prisma.CustomerTransactionWhereInput,
					]
				: []),
			...(salesRepIds.length
				? [
						{
							salesPayments: {
								some: {
									deletedAt: null,
									order: {
										salesRepId: { in: salesRepIds },
									},
								},
							},
						} satisfies Prisma.CustomerTransactionWhereInput,
					]
				: []),
			...(customerIds.length
				? [
						{
							OR: [
								{
									wallet: {
										is: {
											customer: {
												is: { id: { in: customerIds } },
											},
										},
									},
								},
								{
									salesPayments: {
										some: {
											deletedAt: null,
											order: {
												customerId: { in: customerIds },
											},
										},
									},
								},
							],
						} satisfies Prisma.CustomerTransactionWhereInput,
					]
				: []),
		],
	};
}

function applyProjectionFilters(
	rows: SalesFinanceTransaction[],
	filters: SalesFinanceFiltersInput,
) {
	const methods = new Set(filters.paymentMethods || []);
	const statuses = new Set(
		(filters.statuses || []).map((status) => status.trim().toLowerCase()),
	);
	const exceptionCodes = new Set(filters.exceptionCodes || []);
	const applicationStatuses = new Set(filters.applicationStatuses || []);

	return rows.filter((row) => {
		if (methods.size && !methods.has(row.paymentMethod)) return false;
		if (statuses.size && !statuses.has(row.status.trim().toLowerCase())) {
			return false;
		}
		if (
			exceptionCodes.size &&
			![...exceptionCodes].every((code) => row.exceptionCodes.includes(code))
		) {
			return false;
		}
		if (
			applicationStatuses.size &&
			!applicationStatuses.has(row.applicationStatus)
		) {
			return false;
		}
		if (filters.tab === "review" && !row.needsReview) return false;
		return true;
	});
}

function compareNullable(
	left: string | number | Date | null,
	right: string | number | Date | null,
) {
	if (left == null && right == null) return 0;
	if (left == null) return 1;
	if (right == null) return -1;
	if (left instanceof Date && right instanceof Date) {
		return left.getTime() - right.getTime();
	}
	if (typeof left === "number" && typeof right === "number") {
		return left - right;
	}
	return String(left).localeCompare(String(right));
}

function sortTransactions(
	rows: SalesFinanceTransaction[],
	sort: SalesFinanceTransactionsInput["sort"],
) {
	const [field, direction] = sort || ["receivedAt", "desc"];
	const multiplier = direction === "asc" ? 1 : -1;

	return [...rows].sort((left, right) => {
		const compared = compareNullable(left[field], right[field]);
		return compared === 0 ? right.id - left.id : compared * multiplier;
	});
}

async function loadSalesFinanceDataset(
	ctx: TRPCContext,
	filters: SalesFinanceFiltersInput,
) {
	const rows = await ctx.db.customerTransaction.findMany({
		where: buildSalesFinanceWhere(filters),
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: salesFinanceTransactionSelect,
	});

	return applyProjectionFilters(
		rows.map((row) =>
			projectSalesFinanceTransaction(
				row as unknown as SalesFinanceTransactionSource,
			),
		),
		filters,
	);
}

export async function getSalesFinanceTransactions(
	ctx: TRPCContext,
	input: SalesFinanceTransactionsInput,
) {
	const allRows = sortTransactions(
		await loadSalesFinanceDataset(ctx, input),
		input.sort,
	);
	const offset = input.cursor || 0;
	const data = allRows.slice(offset, offset + input.size);
	const nextOffset = offset + data.length;

	return {
		data,
		meta: {
			count: allRows.length,
			cursor: nextOffset < allRows.length ? nextOffset : null,
			hasMore: nextOffset < allRows.length,
			defaultPeriodDays: 30,
		},
	};
}

export async function getSalesFinanceSummary(
	ctx: TRPCContext,
	input: SalesFinanceSummaryInput,
) {
	const transactions = await loadSalesFinanceDataset(ctx, {
		...input,
		tab: "all",
	});
	const summary = summarizeSalesFinanceTransactions(transactions);
	const methodTotals = Array.from(
		transactions.reduce((totals, transaction) => {
			const current = totals.get(transaction.paymentMethod) || {
				paymentMethod: transaction.paymentMethod,
				count: 0,
				receivedAmount: 0,
				refundedAmount: 0,
				netAmount: 0,
			};
			current.count += 1;
			current.receivedAmount = addMoney(
				current.receivedAmount,
				transaction.receivedAmount,
			);
			current.refundedAmount = addMoney(
				current.refundedAmount,
				transaction.refundedAmount,
			);
			current.netAmount = addMoney(current.netAmount, transaction.netAmount);
			totals.set(transaction.paymentMethod, current);
			return totals;
		}, new Map<
			SalesFinanceTransaction["paymentMethod"],
			{
				paymentMethod: SalesFinanceTransaction["paymentMethod"];
				count: number;
				receivedAmount: number;
				refundedAmount: number;
				netAmount: number;
			}
		>()),
	).map(([, total]) => total);
	const { from, to } = resolveDateRange(input);

	return {
		...summary,
		methodTotals,
		period: { from, to },
	};
}

export async function getSalesFinanceTransactionDetail(
	ctx: TRPCContext,
	id: number,
) {
	const row = await ctx.db.customerTransaction.findFirst({
		where: {
			id,
			deletedAt: null,
		},
		select: salesFinanceTransactionSelect,
	});

	return row
		? projectSalesFinanceTransaction(
				row as unknown as SalesFinanceTransactionSource,
			)
		: null;
}
