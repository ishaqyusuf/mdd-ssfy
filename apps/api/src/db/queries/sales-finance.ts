import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { buildOfficeCustomerVisibilityWhere } from "@gnd/db/queries";
import {
	SALES_FINANCE_ANALYTICS_MAX_DAYS,
	type SalesFinanceReceivable,
	type SalesFinanceReceivableSource,
	type SalesFinanceReconciliationEvent,
	type SalesFinanceReconciliationResolution,
	type SalesFinanceTransaction,
	type SalesFinanceTransactionSource,
	addMoney,
	applySalesFinanceReconciliation,
	buildSalesFinanceAnalytics,
	buildSalesFinanceReceivablesReport,
	buildSalesFinanceReconciliationEvidence,
	buildSalesFinanceReconciliationFingerprint,
	buildSalesFinanceReport,
	getSalesFinanceAnalyticsRangeDays,
	projectSalesFinanceReceivable,
	projectSalesFinanceTransaction,
	summarizeSalesFinanceReceivables,
	summarizeSalesFinanceTransactions,
} from "@gnd/sales/payment-system";
import { repairLegacySalesPaymentBalance } from "@gnd/sales/payment-system";
import { createLegacySalesResolution } from "@gnd/sales/resolution-system";
import { TRPCError } from "@trpc/server";
import { endOfDay, isValid, parse, startOfDay, subDays } from "date-fns";

import type {
	SalesFinanceAdoptionPingInput,
	SalesFinanceAnalyticsInput,
	SalesFinanceFiltersInput,
	SalesFinanceReceivablesInput,
	SalesFinanceReceivablesReportInput,
	SalesFinanceReceivablesSummaryInput,
	SalesFinanceReconciliationResolveInput,
	SalesFinanceReconciliationStartInput,
	SalesFinanceReportInput,
	SalesFinanceResolutionSyncInput,
	SalesFinanceResolutionsInput,
	SalesFinanceSummaryInput,
	SalesFinanceTransactionsInput,
} from "../../schemas/sales-finance";
import {
	getSalesResolutions,
	getSalesResolutionsSummary,
} from "./sales-resolution";
import { getAuthUser } from "./user";

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
					subTotal: true,
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

const SALES_FINANCE_RECONCILIATION_EVENT_PREFIX =
	"sales.finance.reconciliation.";

function reconciliationEventType(transactionId: number) {
	return `${SALES_FINANCE_RECONCILIATION_EVENT_PREFIX}${transactionId}`;
}

function eventData(
	value: Prisma.JsonValue,
): SalesFinanceReconciliationEvent["data"] {
	if (!value || Array.isArray(value) || typeof value !== "object") return {};
	const record = value as Record<string, unknown>;

	return {
		action: typeof record.action === "string" ? record.action : null,
		fingerprint:
			typeof record.fingerprint === "string" ? record.fingerprint : null,
		note: typeof record.note === "string" ? record.note : null,
		resolution:
			typeof record.resolution === "string" ? record.resolution : null,
	};
}

async function loadSalesFinanceReconciliationEvents(
	ctx: TRPCContext,
	transactionIds: number[],
) {
	if (!transactionIds.length) {
		return new Map<number, SalesFinanceReconciliationEvent[]>();
	}

	const events = await ctx.db.event.findMany({
		where: {
			deletedAt: null,
			type: {
				in: transactionIds.map(reconciliationEventType),
			},
		},
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			type: true,
			userId: true,
			createdAt: true,
			data: true,
		},
	});
	const byTransaction = new Map<number, SalesFinanceReconciliationEvent[]>();

	for (const event of events) {
		const transactionId = Number(
			event.type.slice(SALES_FINANCE_RECONCILIATION_EVENT_PREFIX.length),
		);
		if (!Number.isInteger(transactionId)) continue;
		const current = byTransaction.get(transactionId) || [];
		current.push({
			id: event.id,
			userId: event.userId,
			createdAt: event.createdAt,
			data: eventData(event.data),
		});
		byTransaction.set(transactionId, current);
	}

	return byTransaction;
}

function parseDateOnly(value?: string | null) {
	if (!value) return null;
	const parsed = parse(value, DATE_ONLY_FORMAT, new Date());
	return isValid(parsed) ? parsed : null;
}

function resolveDateRange(
	filters: Pick<SalesFinanceFiltersInput, "from" | "to">,
) {
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

function applyProjectionFilters<T extends SalesFinanceTransaction>(
	rows: T[],
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

function sortTransactions<T extends SalesFinanceTransaction>(
	rows: T[],
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
	const projected = rows.map((row) =>
		projectSalesFinanceTransaction(
			row as unknown as SalesFinanceTransactionSource,
		),
	);
	const reconciliationEvents = await loadSalesFinanceReconciliationEvents(
		ctx,
		projected.map((row) => row.id),
	);

	return applyProjectionFilters(
		projected.map((row) =>
			applySalesFinanceReconciliation(
				row,
				reconciliationEvents.get(row.id) || [],
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
		transactions.reduce(
			(totals, transaction) => {
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
			},
			new Map<
				SalesFinanceTransaction["paymentMethod"],
				{
					paymentMethod: SalesFinanceTransaction["paymentMethod"];
					count: number;
					receivedAmount: number;
					refundedAmount: number;
					netAmount: number;
				}
			>(),
		),
	).map(([, total]) => total);
	const { from, to } = resolveDateRange(input);

	return {
		...summary,
		methodTotals,
		period: { from, to },
	};
}

export async function getSalesFinanceAnalytics(
	ctx: TRPCContext,
	input: SalesFinanceAnalyticsInput,
) {
	const { from, to } = resolveDateRange(input);
	const rangeDays = getSalesFinanceAnalyticsRangeDays(from, to);

	if (rangeDays > SALES_FINANCE_ANALYTICS_MAX_DAYS) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Finance analytics supports periods up to 10 years.",
		});
	}

	const transactions = await loadSalesFinanceDataset(ctx, input);

	return buildSalesFinanceAnalytics({
		transactions,
		from,
		to,
	});
}

const SALES_FINANCE_REPORT_ROW_LIMIT = 10_000;

export async function getSalesFinanceReport(
	ctx: TRPCContext,
	input: SalesFinanceReportInput,
) {
	const transactions = sortTransactions(
		await loadSalesFinanceDataset(ctx, input),
		["receivedAt", "desc"],
	);

	if (transactions.length > SALES_FINANCE_REPORT_ROW_LIMIT) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `This report contains ${transactions.length.toLocaleString()} payments. Narrow the filters to ${SALES_FINANCE_REPORT_ROW_LIMIT.toLocaleString()} payments or fewer.`,
		});
	}

	const { from, to } = resolveDateRange(input);

	return buildSalesFinanceReport({
		type: input.reportType,
		transactions,
		context: {
			from,
			to,
			tab: input.tab,
			q: input.q,
			paymentMethods: input.paymentMethods,
			statuses: input.statuses,
			exceptionCodes: input.exceptionCodes,
			applicationStatuses: input.applicationStatuses,
		},
	});
}

export async function getSalesFinanceTransactionDetail(
	ctx: TRPCContext,
	id: number,
) {
	const row = await ctx.db.customerTransaction.findFirst({
		where: {
			id,
			deletedAt: null,
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
		select: salesFinanceTransactionSelect,
	});

	if (!row) return null;

	const projected = projectSalesFinanceTransaction(
		row as unknown as SalesFinanceTransactionSource,
	);
	const events =
		(await loadSalesFinanceReconciliationEvents(ctx, [projected.id])).get(
			projected.id,
		) || [];

	return {
		...applySalesFinanceReconciliation(projected, events),
		hasSquarePayment: Boolean(row.squarePayment),
		reconciliationHistory: events
			.slice()
			.reverse()
			.map((event) => ({
				id: event.id,
				action: event.data.action || "unknown",
				note: event.data.note || null,
				resolution: event.data.resolution || null,
				createdAt: event.createdAt || null,
				userId: event.userId || null,
			})),
	};
}

export function getSalesFinanceResolutions(
	ctx: TRPCContext,
	input: SalesFinanceResolutionsInput,
) {
	return getSalesResolutions(ctx, input);
}

export function getSalesFinanceResolutionsSummary(
	ctx: TRPCContext,
	input: SalesFinanceResolutionsInput,
) {
	return getSalesResolutionsSummary(ctx, input);
}

export async function syncSalesFinanceResolutionBalance(
	ctx: TRPCContext,
	input: SalesFinanceResolutionSyncInput,
) {
	const user = await getAuthUser(ctx);

	return ctx.db.$transaction(async (db) => {
		const before = await db.salesOrders.findFirst({
			where: {
				id: input.salesId,
				deletedAt: null,
				type: "order",
			},
			select: {
				id: true,
				orderId: true,
				grandTotal: true,
				amountDue: true,
			},
		});
		if (!before) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Sales invoice was not found.",
			});
		}

		const after = await repairLegacySalesPaymentBalance(db, {
			salesId: input.salesId,
		});
		if (!after) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Sales invoice was not found after balance repair.",
			});
		}

		await createLegacySalesResolution(db, {
			salesId: input.salesId,
			action: "sync due amount",
			reason: input.note,
			resolvedBy: user.name || "Unknown operator",
		});
		await db.event.create({
			data: {
				type: `sales.finance.account-resolution.${input.salesId}`,
				userId: ctx.userId,
				data: {
					action: "sync_due_amount",
					reason: input.note,
					salesId: input.salesId,
					orderId: before.orderId,
					before: {
						grandTotal: Number(before.grandTotal || 0),
						amountDue: Number(before.amountDue || 0),
					},
					after: {
						grandTotal: Number(after.grandTotal || 0),
						amountDue: Number(after.amountDue || 0),
					},
				},
			},
		});

		return {
			salesId: after.id,
			orderId: before.orderId,
			beforeAmountDue: Number(before.amountDue || 0),
			afterAmountDue: Number(after.amountDue || 0),
		};
	});
}

async function loadRawSalesFinanceTransaction(ctx: TRPCContext, id: number) {
	const row = await ctx.db.customerTransaction.findFirst({
		where: {
			id,
			deletedAt: null,
			OR: [
				{
					salesPayments: {
						some: {
							deletedAt: null,
							order: { type: "order" },
						},
					},
				},
				{ squarePayment: { isNot: null } },
				{ refundTx: { some: { deletedAt: null } } },
			],
		},
		select: salesFinanceTransactionSelect,
	});

	return row
		? projectSalesFinanceTransaction(
				row as unknown as SalesFinanceTransactionSource,
			)
		: null;
}

export async function startSalesFinanceReconciliation(
	ctx: TRPCContext,
	input: SalesFinanceReconciliationStartInput,
) {
	const transaction = await loadRawSalesFinanceTransaction(ctx, input.id);
	if (!transaction) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Finance transaction not found.",
		});
	}
	if (!transaction.needsReview) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "This transaction has no current review exceptions.",
		});
	}

	const events =
		(await loadSalesFinanceReconciliationEvents(ctx, [transaction.id])).get(
			transaction.id,
		) || [];
	const state = applySalesFinanceReconciliation(transaction, events);
	if (state.reconciliationStatus === "in_progress") {
		return getSalesFinanceTransactionDetail(ctx, transaction.id);
	}

	await ctx.db.event.create({
		data: {
			type: reconciliationEventType(transaction.id),
			userId: ctx.userId,
			data: {
				action: "opened",
				fingerprint: buildSalesFinanceReconciliationFingerprint(transaction),
				note: input.note?.trim() || null,
				evidence: buildSalesFinanceReconciliationEvidence(transaction),
			},
		},
	});

	return getSalesFinanceTransactionDetail(ctx, transaction.id);
}

export async function resolveSalesFinanceReconciliation(
	ctx: TRPCContext,
	input: SalesFinanceReconciliationResolveInput,
) {
	const transaction = await loadRawSalesFinanceTransaction(ctx, input.id);
	if (!transaction) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Finance transaction not found.",
		});
	}

	const events =
		(await loadSalesFinanceReconciliationEvents(ctx, [transaction.id])).get(
			transaction.id,
		) || [];
	const state = applySalesFinanceReconciliation(transaction, events);
	if (state.reconciliationStatus !== "in_progress") {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"Open a reconciliation session against the current evidence before resolving it.",
		});
	}

	await ctx.db.event.create({
		data: {
			type: reconciliationEventType(transaction.id),
			userId: ctx.userId,
			data: {
				action: "resolved",
				fingerprint: buildSalesFinanceReconciliationFingerprint(transaction),
				note: input.note.trim(),
				resolution:
					input.resolution satisfies SalesFinanceReconciliationResolution,
				evidence: buildSalesFinanceReconciliationEvidence(transaction),
			},
		},
	});

	return getSalesFinanceTransactionDetail(ctx, transaction.id);
}

export async function recordSalesFinanceAdoption(
	ctx: TRPCContext,
	input: SalesFinanceAdoptionPingInput,
) {
	const legacy = input.surface === "legacy-accounting";

	const pageView = await ctx.db.pageView.create({
		data: {
			url: legacy ? "/sales-book/accounting" : "/sales-book/finance",
			group: `sales-finance:${input.surface}`,
			userId: ctx.userId,
		},
		select: {
			id: true,
			createdAt: true,
		},
	});
	const firstFinanceView = legacy
		? null
		: await ctx.db.pageView.findFirst({
				where: {
					deletedAt: null,
					url: "/sales-book/finance",
					userId: ctx.userId,
				},
				orderBy: [{ createdAt: "asc" }, { id: "asc" }],
				select: { id: true },
			});

	return {
		...pageView,
		isFirstFinanceVisit: firstFinanceView?.id === pageView.id,
	};
}

export async function getSalesFinanceAdoptionReadiness(ctx: TRPCContext) {
	const from = startOfDay(subDays(new Date(), 29));
	const views = await ctx.db.pageView.findMany({
		where: {
			deletedAt: null,
			createdAt: { gte: from },
			url: {
				in: ["/sales-book/finance", "/sales-book/accounting"],
			},
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			url: true,
			group: true,
			userId: true,
			createdAt: true,
		},
	});
	const financeViews = views.filter(
		(view) => view.url === "/sales-book/finance",
	);
	const legacyViews = views.filter(
		(view) => view.url === "/sales-book/accounting",
	);
	const countSurface = (surface: string) =>
		financeViews.filter((view) => view.group === `sales-finance:${surface}`)
			.length;

	return {
		period: {
			from,
			to: endOfDay(new Date()),
		},
		finance: {
			views: financeViews.length,
			uniqueUsers: new Set(
				financeViews.map((view) => view.userId).filter(Boolean),
			).size,
			lastViewedAt: financeViews[0]?.createdAt || null,
			surfaces: {
				payments: countSurface("payments"),
				review: countSurface("review"),
				receivables: countSurface("receivables"),
				resolution: countSurface("resolution"),
			},
		},
		legacy: {
			views: legacyViews.length,
			uniqueUsers: new Set(
				legacyViews.map((view) => view.userId).filter(Boolean),
			).size,
			lastViewedAt: legacyViews[0]?.createdAt || null,
		},
		gates: [
			{
				key: "excel-reports",
				label: "Seven filter-aware Excel reports",
				status: "ready",
			},
			{
				key: "receivables",
				label: "Receivables aging and drill-down",
				status: "ready",
			},
			{
				key: "reconciliation",
				label: "Audited reconciliation workflow",
				status: "ready",
			},
			{
				key: "account-resolution",
				label: "Permission-guarded account resolution",
				status: "ready",
			},
			{
				key: "browser-acceptance",
				label: "Responsive operator acceptance",
				status: "pending",
			},
			{
				key: "retirement-approval",
				label: "Explicit legacy retirement approval",
				status: "pending",
			},
		] as const,
		retirementEligible: false,
		retirementReason:
			"Legacy Accounting remains available until responsive operator acceptance and explicit retirement approval are recorded.",
	};
}

const salesFinanceReceivableSelect = {
	id: true,
	orderId: true,
	slug: true,
	createdAt: true,
	paymentDueDate: true,
	paymentTerm: true,
	grandTotal: true,
	amountDue: true,
	invoiceStatus: true,
	status: true,
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
			email: true,
			phoneNo: true,
		},
	},
	salesRep: {
		select: {
			name: true,
			email: true,
		},
	},
	payments: {
		where: {
			deletedAt: null,
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			amount: true,
			status: true,
			createdAt: true,
			transaction: {
				select: {
					txId: true,
					paymentMethod: true,
				},
			},
		},
	},
} satisfies Prisma.SalesOrdersSelect;

type ReceivableFilters =
	| SalesFinanceReceivablesInput
	| SalesFinanceReceivablesSummaryInput;

function buildSalesFinanceReceivableWhere(
	filters: ReceivableFilters,
): Prisma.SalesOrdersWhereInput {
	const from = parseDateOnly(filters.from);
	const to = parseDateOnly(filters.to);
	const q = filters.q?.trim();

	return {
		deletedAt: null,
		type: "order",
		grandTotal: { gt: 0 },
		AND: [
			{
				OR: [
					{ customer: { is: buildOfficeCustomerVisibilityWhere() } },
					{ customerId: null },
				],
			},
			...(from || to
				? [
						{
							paymentDueDate: {
								...(from ? { gte: startOfDay(from) } : {}),
								...(to ? { lte: endOfDay(to) } : {}),
							},
						} satisfies Prisma.SalesOrdersWhereInput,
					]
				: []),
			...(q
				? [
						{
							OR: [
								{ orderId: { contains: q } },
								{ invoiceStatus: { contains: q } },
								{ paymentTerm: { contains: q } },
								{ billingAddress: { is: { name: { contains: q } } } },
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
								{
									salesRep: {
										is: {
											OR: [
												{ name: { contains: q } },
												{ email: { contains: q } },
											],
										},
									},
								},
							],
						} satisfies Prisma.SalesOrdersWhereInput,
					]
				: []),
		],
	};
}

function applyReceivableProjectionFilters(
	rows: SalesFinanceReceivable[],
	filters: ReceivableFilters,
) {
	const agingBuckets = new Set(filters.agingBuckets || []);

	return rows.filter(
		(row) =>
			row.amountDue > 0 &&
			(!agingBuckets.size || agingBuckets.has(row.agingBucket)),
	);
}

function sortReceivables(
	rows: SalesFinanceReceivable[],
	sort: SalesFinanceReceivablesInput["sort"],
) {
	const [field, direction] = sort || ["dueAt", "asc"];
	const multiplier = direction === "asc" ? 1 : -1;

	return [...rows].sort((left, right) => {
		const compared = compareNullable(left[field], right[field]);
		return compared === 0 ? right.id - left.id : compared * multiplier;
	});
}

async function loadSalesFinanceReceivableDataset(
	ctx: TRPCContext,
	filters: ReceivableFilters,
) {
	const asOf = new Date();
	const rows = await ctx.db.salesOrders.findMany({
		where: buildSalesFinanceReceivableWhere(filters),
		orderBy: [{ paymentDueDate: "asc" }, { id: "desc" }],
		select: salesFinanceReceivableSelect,
	});

	return applyReceivableProjectionFilters(
		rows.map((row) =>
			projectSalesFinanceReceivable(
				row as unknown as SalesFinanceReceivableSource,
				asOf,
			),
		),
		filters,
	);
}

export async function getSalesFinanceReceivables(
	ctx: TRPCContext,
	input: SalesFinanceReceivablesInput,
) {
	const allRows = sortReceivables(
		await loadSalesFinanceReceivableDataset(ctx, input),
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
		},
	};
}

export async function getSalesFinanceReceivablesSummary(
	ctx: TRPCContext,
	input: SalesFinanceReceivablesSummaryInput,
) {
	return summarizeSalesFinanceReceivables(
		await loadSalesFinanceReceivableDataset(ctx, input),
	);
}

export async function getSalesFinanceReceivablesReport(
	ctx: TRPCContext,
	input: SalesFinanceReceivablesReportInput,
) {
	const receivables = sortReceivables(
		await loadSalesFinanceReceivableDataset(ctx, input),
		["dueAt", "asc"],
	);

	if (receivables.length > SALES_FINANCE_REPORT_ROW_LIMIT) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `This report contains ${receivables.length.toLocaleString()} receivables. Narrow the filters to ${SALES_FINANCE_REPORT_ROW_LIMIT.toLocaleString()} invoices or fewer.`,
		});
	}

	return buildSalesFinanceReceivablesReport({
		type: input.reportType,
		receivables,
		context: {
			from: parseDateOnly(input.from),
			to: parseDateOnly(input.to),
			q: input.q,
			agingBuckets: input.agingBuckets,
		},
	});
}

export async function getSalesFinanceReceivableDetail(
	ctx: TRPCContext,
	id: number,
) {
	const row = await ctx.db.salesOrders.findFirst({
		where: {
			id,
			deletedAt: null,
			type: "order",
			OR: [
				{ customer: { is: buildOfficeCustomerVisibilityWhere() } },
				{ customerId: null },
			],
		},
		select: salesFinanceReceivableSelect,
	});

	return row
		? projectSalesFinanceReceivable(
				row as unknown as SalesFinanceReceivableSource,
			)
		: null;
}
