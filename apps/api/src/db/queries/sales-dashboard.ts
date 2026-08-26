import type {
	SalesPerformanceReportInput,
	SalesTaxReportInput,
} from "@api/schemas/sales-dashboard";
import type { TRPCContext } from "@api/trpc/init";
import { overallStatus } from "@api/utils/sales";
import type { Prisma } from "@gnd/db";
import {
	buildOfficeCustomerVisibilityWhere,
	listSalesTaxReportEntries,
} from "@gnd/db/queries";
import { repairSalesInvoiceCccDisplay } from "@gnd/sales/payment-system";
import {
	type SalesPerformanceLineItemSource,
	type SalesPerformanceOrderSource,
	type SalesPerformanceQuoteSource,
	buildSalesPerformanceReport,
} from "@gnd/sales/performance-reports";
import {
	type SalesReportingFilter,
	calculateReportingChange,
	formatSalesReportingDate,
	getPreviousSalesReportingPeriod,
	getSalesReportingGranularity,
	resolveSalesReportingPeriod,
} from "@gnd/sales/reporting";
import {
	buildSalesTaxReport,
	resolveSalesTaxReportPeriod,
} from "@gnd/sales/sales-tax-report";
import type { SalesType } from "@sales/types";
import { TRPCError } from "@trpc/server";
import {
	addDays,
	addMonths,
	addWeeks,
	eachDayOfInterval,
	eachMonthOfInterval,
	eachWeekOfInterval,
	format,
	startOfMonth,
	startOfWeek,
} from "date-fns";

export type SalesDashboardFilter = SalesReportingFilter & {
	salesRepIds?: number[] | null;
	salesChannels?: string[] | null;
};

export function formatSalesDashboardDate(date: Date) {
	return formatSalesReportingDate(date);
}

export function getSalesDashboardCreatedAtRange(filter: SalesDashboardFilter) {
	const { from, to } = resolveSalesReportingPeriod(filter);
	return { gte: from, lte: to };
}

function getWhereClause(
	filter: SalesDashboardFilter,
	type?: SalesType,
	range = getSalesDashboardCreatedAtRange(filter),
) {
	const salesRepIds = filter.salesRepIds?.filter(Boolean) || [];
	const salesChannels = filter.salesChannels?.filter(Boolean) || [];

	return {
		deletedAt: null,
		...(type ? { type } : {}),
		createdAt: range,
		...(salesRepIds.length ? { salesRepId: { in: salesRepIds } } : {}),
		...(salesChannels.length ? { salesChannel: { in: salesChannels } } : {}),
		OR: [
			{ customerId: null },
			{ customer: { is: buildOfficeCustomerVisibilityWhere() } },
		],
	} satisfies Prisma.SalesOrdersWhereInput;
}

async function getPeriodSummary(
	ctx: TRPCContext,
	filter: SalesDashboardFilter,
	range: { gte: Date; lte: Date },
) {
	const salesWhere = getWhereClause(filter, "order", range);
	const quotesWhere = getWhereClause(filter, "quote", range);
	const [bookedSales, orderCount, quoteCount] = await Promise.all([
		ctx.db.salesOrders.aggregate({
			_sum: { grandTotal: true },
			where: salesWhere,
		}),
		ctx.db.salesOrders.count({ where: salesWhere }),
		ctx.db.salesOrders.count({ where: quotesWhere }),
	]);
	const bookedSalesValue = bookedSales._sum.grandTotal ?? 0;

	return {
		bookedSales: bookedSalesValue,
		orderCount,
		quoteCount,
		averageOrderValue: orderCount ? bookedSalesValue / orderCount : 0,
	};
}

export async function getKpis(ctx: TRPCContext, filter: SalesDashboardFilter) {
	const currentRange = getSalesDashboardCreatedAtRange(filter);
	const previous = getPreviousSalesReportingPeriod(filter);
	const [current, previousSummary, activeProductionOrders] = await Promise.all([
		getPeriodSummary(ctx, filter, currentRange),
		getPeriodSummary(ctx, filter, { gte: previous.from, lte: previous.to }),
		ctx.db.salesOrders.count({
			where: {
				...getWhereClause(filter, "order", {
					gte: new Date(0),
					lte: new Date(),
				}),
				prodStatus: {
					in: ["pending", "in_progress", "started"],
				},
			},
		}),
	]);

	return {
		...current,
		activeProductionOrders,
		change: {
			bookedSales: calculateReportingChange(
				current.bookedSales,
				previousSummary.bookedSales,
			),
			orderCount: calculateReportingChange(
				current.orderCount,
				previousSummary.orderCount,
			),
			quoteCount: calculateReportingChange(
				current.quoteCount,
				previousSummary.quoteCount,
			),
			averageOrderValue: calculateReportingChange(
				current.averageOrderValue,
				previousSummary.averageOrderValue,
			),
		},
		period: currentRange,
		previousPeriod: { from: previous.from, to: previous.to },
		// Compatibility aliases for existing cache consumers.
		totalRevenue: current.bookedSales,
		totalDue: 0,
		newSales: current.orderCount,
		newQuotes: current.quoteCount,
	};
}

function bucketStart(date: Date, granularity: "day" | "week" | "month") {
	if (granularity === "week") return startOfWeek(date, { weekStartsOn: 1 });
	if (granularity === "month") return startOfMonth(date);
	return date;
}

function reportingInterval(
	from: Date,
	to: Date,
	granularity: "day" | "week" | "month",
) {
	if (granularity === "week") {
		return eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 });
	}
	if (granularity === "month") {
		return eachMonthOfInterval({ start: from, end: to });
	}
	return eachDayOfInterval({ start: from, end: to });
}

function nextBucketDate(date: Date, granularity: "day" | "week" | "month") {
	if (granularity === "week") return addWeeks(date, 1);
	if (granularity === "month") return addMonths(date, 1);
	return addDays(date, 1);
}

export async function getRevenueOverTime(
	ctx: TRPCContext,
	filter: SalesDashboardFilter,
) {
	const where = getWhereClause(filter, "order");
	const { from, to } = resolveSalesReportingPeriod(filter);
	const granularity = getSalesReportingGranularity(filter);
	const sales = await ctx.db.salesOrders.findMany({
		where,
		select: {
			createdAt: true,
			grandTotal: true,
		},
		orderBy: {
			createdAt: "asc",
		},
	});
	const totals = new Map<string, { revenue: number; orders: number }>();

	for (const sale of sales) {
		if (!sale.createdAt) continue;
		const key = formatSalesDashboardDate(
			bucketStart(sale.createdAt, granularity),
		);
		const current = totals.get(key) || { revenue: 0, orders: 0 };
		current.revenue += sale.grandTotal ?? 0;
		current.orders += 1;
		totals.set(key, current);
	}

	return reportingInterval(from, to, granularity).map((date) => {
		const start = bucketStart(date, granularity);
		const rawDate = formatSalesDashboardDate(start);
		const total = totals.get(rawDate) || { revenue: 0, orders: 0 };

		return {
			date:
				granularity === "month"
					? format(start, "MMM yyyy")
					: granularity === "week"
						? `Week of ${format(start, "MMM d")}`
						: format(start, "MMM d"),
			rawDate,
			bucketTo: formatSalesDashboardDate(
				new Date(
					Math.min(
						nextBucketDate(start, granularity).getTime() - 1,
						to.getTime(),
					),
				),
			),
			revenue: total.revenue,
			orders: total.orders,
			averageOrderValue: total.orders ? total.revenue / total.orders : 0,
			granularity,
		};
	});
}

export async function getRecentSales(
	ctx: TRPCContext,
	filter: SalesDashboardFilter,
) {
	const recent = await ctx.db.salesOrders.findMany({
		where: getWhereClause(filter, "order"),
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: 5,
		select: {
			id: true,
			orderId: true,
			slug: true,
			createdAt: true,
			grandTotal: true,
			salesChannel: true,
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
		},
	});

	return recent.map((sale) => ({
		id: sale.id,
		orderNo: sale.orderId,
		slug: sale.slug,
		createdAt: sale.createdAt,
		bookedSales: sale.grandTotal ?? 0,
		salesChannel: sale.salesChannel || "direct",
		customerName:
			sale.customer?.businessName ||
			sale.customer?.name ||
			sale.billingAddress?.name ||
			"Walk-in customer",
	}));
}

export async function getTopProducts(
	ctx: TRPCContext,
	filter: SalesDashboardFilter,
) {
	const products = await ctx.db.salesOrderItems.groupBy({
		by: ["description"],
		_sum: {
			qty: true,
			total: true,
		},
		_count: {
			_all: true,
		},
		where: {
			deletedAt: null,
			salesOrder: {
				is: getWhereClause(filter, "order"),
			},
			description: {
				not: null,
			},
		},
		orderBy: {
			_sum: {
				total: "desc",
			},
		},
		take: 8,
	});

	return products.map((product) => ({
		id: null,
		name: product.description || "Unlabeled product",
		count: product._sum.qty ?? 0,
		bookedSales: product._sum.total ?? 0,
		lineCount: product._count._all,
	}));
}

export async function getSalesRepLeaderboard(
	ctx: TRPCContext,
	filter: SalesDashboardFilter,
) {
	const salesWhere = getWhereClause(filter, "order");
	const reps = await ctx.db.salesOrders.groupBy({
		by: ["salesRepId"],
		_sum: {
			grandTotal: true,
		},
		_count: {
			_all: true,
		},
		where: {
			...salesWhere,
			salesRepId: {
				not: null,
			},
		},
		orderBy: {
			_sum: {
				grandTotal: "desc",
			},
		},
		take: 8,
	});

	const userIds = reps.map((rep) => rep.salesRepId).filter(Boolean) as number[];
	const users = await ctx.db.users.findMany({
		where: {
			id: { in: userIds },
		},
		select: {
			id: true,
			name: true,
		},
	});
	const userMap = new Map(
		users.map((user) => [user.id, user.name || "Unknown sales rep"]),
	);

	return reps.flatMap((rep) => {
		if (rep.salesRepId == null) return [];
		const orderCount = rep._count._all;
		const bookedSales = rep._sum.grandTotal ?? 0;
		return [
			{
				id: rep.salesRepId,
				name: userMap.get(rep.salesRepId) || "Unknown sales rep",
				totalSales: bookedSales,
				bookedSales,
				orderCount,
				averageOrderValue: orderCount ? bookedSales / orderCount : 0,
			},
		];
	});
}

export async function getSalesChannelBreakdown(
	ctx: TRPCContext,
	filter: SalesDashboardFilter,
) {
	const channels = await ctx.db.salesOrders.groupBy({
		by: ["salesChannel"],
		_sum: { grandTotal: true },
		_count: { _all: true },
		where: getWhereClause(filter, "order"),
		orderBy: { _sum: { grandTotal: "desc" } },
	});

	return channels.map((channel) => ({
		channel: channel.salesChannel || "direct",
		bookedSales: channel._sum.grandTotal ?? 0,
		orderCount: channel._count._all,
	}));
}

const SALES_REPORT_ROW_LIMIT = 10_000;

export async function getSalesTaxReport(
	ctx: TRPCContext,
	input: SalesTaxReportInput,
	now = new Date(),
) {
	let period: ReturnType<typeof resolveSalesTaxReportPeriod>;
	try {
		period = resolveSalesTaxReportPeriod({
			from: input.from,
			to: input.to,
			now,
		});
	} catch (error) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message:
				error instanceof Error
					? error.message
					: "Invalid sales tax report period.",
		});
	}
	const rows = await listSalesTaxReportEntries(ctx.db, {
		from: period.from,
		toExclusive: period.toExclusive,
		limit: SALES_REPORT_ROW_LIMIT,
	});

	if (rows.length > SALES_REPORT_ROW_LIMIT) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `This report contains more than ${SALES_REPORT_ROW_LIMIT.toLocaleString()} tax ledger entries. Choose a shorter period and try again.`,
		});
	}

	return buildSalesTaxReport({
		period,
		entries: rows.map((entry) => ({
			salesOrderId: entry.salesOrderId,
			orderNo: entry.orderNo,
			customerName: entry.customerName,
			recognizedAt: entry.recognizedAt.toISOString(),
			entryType: entry.entryType,
			recognitionSource: entry.recognitionSource,
			taxCode: entry.taxCode,
			total: entry.invoiceTotalCents / 100,
			grossSales: entry.grossSalesCents / 100,
			exemptSales: entry.exemptSalesCents / 100,
			taxableAmount: entry.taxableAmountCents / 100,
			stateTax: entry.stateTaxCents / 100,
			surtax: entry.surtaxCents / 100,
			tax: entry.taxDueCents / 100,
		})),
	});
}

function reportCustomerName(row: {
	customer?: {
		businessName?: string | null;
		name?: string | null;
	} | null;
	billingAddress?: { name?: string | null } | null;
}) {
	return (
		row.customer?.businessName ||
		row.customer?.name ||
		row.billingAddress?.name ||
		"Walk-in customer"
	);
}

function reportSalesRepName(row: {
	salesRep?: { name?: string | null; email?: string | null } | null;
}) {
	return row.salesRep?.name || row.salesRep?.email || "Unassigned";
}

export async function getSalesPerformanceReport(
	ctx: TRPCContext,
	input: SalesPerformanceReportInput,
) {
	const filter: SalesDashboardFilter = input;
	const needsOrders = [
		"performance-summary",
		"orders-ledger",
		"sales-reps",
		"customers",
	].includes(input.reportType);
	const needsQuotes = ["performance-summary", "quote-activity"].includes(
		input.reportType,
	);
	const needsLineItems = input.reportType === "products";
	const reportTake = SALES_REPORT_ROW_LIMIT + 1;

	const [kpis, orderRows, quoteRows, lineItemRows, selectedReps] =
		await Promise.all([
			getKpis(ctx, filter),
			needsOrders
				? ctx.db.salesOrders.findMany({
						where: getWhereClause(filter, "order"),
						orderBy: [{ createdAt: "desc" }, { id: "desc" }],
						take: reportTake,
						select: {
							id: true,
							orderId: true,
							createdAt: true,
							grandTotal: true,
							customerId: true,
							salesRepId: true,
							salesChannel: true,
							status: true,
							priority: true,
							customer: {
								select: { businessName: true, name: true },
							},
							billingAddress: { select: { name: true } },
							salesRep: { select: { name: true, email: true } },
						},
					})
				: Promise.resolve([]),
			needsQuotes
				? ctx.db.salesOrders.findMany({
						where: getWhereClause(filter, "quote"),
						orderBy: [{ createdAt: "desc" }, { id: "desc" }],
						take: reportTake,
						select: {
							id: true,
							orderId: true,
							createdAt: true,
							goodUntil: true,
							grandTotal: true,
							customerId: true,
							salesRepId: true,
							salesChannel: true,
							status: true,
							customer: {
								select: { businessName: true, name: true },
							},
							billingAddress: { select: { name: true } },
							salesRep: { select: { name: true, email: true } },
						},
					})
				: Promise.resolve([]),
			needsLineItems
				? ctx.db.salesOrderItems.findMany({
						where: {
							deletedAt: null,
							salesOrder: { is: getWhereClause(filter, "order") },
						},
						orderBy: [{ createdAt: "desc" }, { id: "desc" }],
						take: reportTake,
						select: {
							id: true,
							productId: true,
							description: true,
							qty: true,
							total: true,
							salesOrder: {
								select: {
									orderId: true,
									createdAt: true,
									customer: {
										select: { businessName: true, name: true },
									},
									billingAddress: { select: { name: true } },
									salesRep: { select: { name: true, email: true } },
								},
							},
						},
					})
				: Promise.resolve([]),
			input.salesRepIds?.length
				? ctx.db.users.findMany({
						where: { id: { in: input.salesRepIds } },
						select: { name: true, email: true },
					})
				: Promise.resolve([]),
		]);

	const sourceCount =
		input.reportType === "products"
			? lineItemRows.length
			: input.reportType === "quote-activity"
				? quoteRows.length
				: input.reportType === "performance-summary"
					? orderRows.length + quoteRows.length
					: orderRows.length;

	if (sourceCount > SALES_REPORT_ROW_LIMIT) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `This report contains more than ${SALES_REPORT_ROW_LIMIT.toLocaleString()} source records. Narrow the period or filters and try again.`,
		});
	}

	const trend =
		input.reportType === "performance-summary"
			? await getRevenueOverTime(ctx, filter)
			: [];

	const orders: SalesPerformanceOrderSource[] = orderRows.map((order) => ({
		id: order.id,
		orderNo: order.orderId,
		createdAt: order.createdAt,
		customerId: order.customerId,
		customerName: reportCustomerName(order),
		salesRepId: order.salesRepId,
		salesRepName: reportSalesRepName(order),
		salesChannel: order.salesChannel || "direct",
		status: order.status || "unknown",
		priority: order.priority || "NORMAL",
		bookedSales: order.grandTotal ?? 0,
	}));
	const quotes: SalesPerformanceQuoteSource[] = quoteRows.map((quote) => ({
		id: quote.id,
		quoteNo: quote.orderId,
		createdAt: quote.createdAt,
		goodUntil: quote.goodUntil,
		customerId: quote.customerId,
		customerName: reportCustomerName(quote),
		salesRepId: quote.salesRepId,
		salesRepName: reportSalesRepName(quote),
		salesChannel: quote.salesChannel || "direct",
		status: quote.status || "unknown",
		quoteValue: quote.grandTotal ?? 0,
	}));
	const lineItems: SalesPerformanceLineItemSource[] = lineItemRows.map(
		(item) => ({
			id: item.id,
			orderNo: item.salesOrder?.orderId || "Unknown order",
			createdAt: item.salesOrder?.createdAt || null,
			productId: item.productId,
			customerName: item.salesOrder
				? reportCustomerName(item.salesOrder)
				: "Walk-in customer",
			salesRepName: item.salesOrder
				? reportSalesRepName(item.salesOrder)
				: "Unassigned",
			description: item.description || "Unlabeled product",
			quantity: item.qty ?? 0,
			bookedSales: item.total ?? 0,
		}),
	);

	return buildSalesPerformanceReport({
		type: input.reportType,
		context: {
			from: kpis.period.gte,
			to: kpis.period.lte,
			salesRepNames: selectedReps.map(
				(rep) => rep.name || rep.email || "Unknown sales rep",
			),
			salesChannels: input.salesChannels,
		},
		summary: {
			bookedSales: kpis.bookedSales,
			orderCount: kpis.orderCount,
			quoteCount: kpis.quoteCount,
			averageOrderValue: kpis.averageOrderValue,
			change: kpis.change,
		},
		orders,
		quotes,
		lineItems,
		trend: trend.map((row) => ({
			date: row.date,
			bookedSales: row.revenue,
			orderCount: row.orders,
			averageOrderValue: row.averageOrderValue,
		})),
	});
}

export async function getMobileSalesDashboardOverview(ctx: TRPCContext) {
	const [orders, recentOrders] = await Promise.all([
		ctx.db.salesOrders.findMany({
			where: {
				deletedAt: null,
				type: "order",
			},
			select: {
				id: true,
				stat: {
					where: {
						deletedAt: null,
					},
				},
				deliveries: {
					where: {
						deletedAt: null,
					},
					select: {
						status: true,
					},
				},
			},
		}),
		ctx.db.salesOrders.findMany({
			where: {
				deletedAt: null,
				type: "order",
			},
			orderBy: {
				createdAt: "desc",
			},
			take: 10,
			select: {
				id: true,
				orderId: true,
				createdAt: true,
				grandTotal: true,
				amountDue: true,
				meta: true,
				deliveryOption: true,
				customer: {
					select: {
						name: true,
						businessName: true,
						phoneNo: true,
					},
				},
			},
		}),
	]);

	const production = {
		pending: 0,
		inProgress: 0,
		completed: 0,
		unknown: 0,
	};
	const delivery = {
		queue: 0,
		inProgress: 0,
		completed: 0,
		cancelled: 0,
	};

	for (const order of orders) {
		const status = overallStatus(order.stat);
		const prodStatus = (status?.production?.status || "").toLowerCase();
		if (prodStatus === "pending") production.pending += 1;
		else if (prodStatus === "in progress") production.inProgress += 1;
		else if (prodStatus === "completed") production.completed += 1;
		else production.unknown += 1;

		for (const d of order.deliveries) {
			const value = (d.status || "").toLowerCase();
			if (value === "queue" || value === "packed") delivery.queue += 1;
			else if (value === "in progress") delivery.inProgress += 1;
			else if (value === "completed") delivery.completed += 1;
			else if (value === "cancelled") delivery.cancelled += 1;
		}
	}

	return {
		orders: {
			total: orders.length,
		},
		production,
		delivery,
		recentSales: recentOrders.map((order) => {
			const invoiceDisplay = repairSalesInvoiceCccDisplay({
				baseTotal: order.grandTotal,
				meta: order.meta,
			});
			const pendingDisplay = repairSalesInvoiceCccDisplay({
				baseTotal: order.amountDue,
				paymentMethod: invoiceDisplay.paymentMethod,
				cccPercentage: invoiceDisplay.cccPercentage,
				meta: order.meta,
			});
			const total = Number(order.grandTotal || 0);
			const due = Number(order.amountDue || 0);

			return {
				id: order.id,
				orderId: order.orderId,
				customerName:
					order.customer?.businessName || order.customer?.name || "-",
				customerPhone: order.customer?.phoneNo || null,
				total,
				due,
				paid: total - due,
				displayTotal: invoiceDisplay.totalWithCcc,
				displayPending: pendingDisplay.totalWithCcc,
				displayCcc: invoiceDisplay.ccc,
				createdAt: order.createdAt?.toISOString() || null,
				deliveryOption: order.deliveryOption || null,
			};
		}),
		updatedAt: new Date().toISOString(),
	};
}
