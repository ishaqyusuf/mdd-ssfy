import type { SalesRepDashboardPeriodInput } from "@api/schemas/sales-rep-dashboard";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import {
	DEALER_ORDER_REQUEST_TYPE,
	summarizeDealerRequestSla,
} from "@gnd/db/queries";
import {
	projectSalesFinanceReceivable,
	summarizeSalesFinanceReceivables,
} from "@gnd/sales/payment-system";
import {
	calculateReportingChange,
	getPreviousSalesReportingPeriod,
	resolveSalesReportingPeriod,
} from "@gnd/sales/reporting";
import { addDays } from "date-fns";
import { getKpis, getRevenueOverTime } from "./sales-dashboard";

const SUCCESSFUL_PAYMENT_STATUSES = ["success", "completed", "paid"] as const;
const TERMINAL_ORDER_STATUSES = [
	"cancelled",
	"completed",
	"delivered",
] as const;

function customerName(
	customer?: {
		businessName?: string | null;
		name?: string | null;
	} | null,
) {
	return customer?.businessName || customer?.name || "Walk-in customer";
}

function activeOrderWhere(userId: number) {
	return {
		deletedAt: null,
		type: "order",
		salesRepId: userId,
		OR: [{ status: null }, { status: { notIn: [...TERMINAL_ORDER_STATUSES] } }],
	} satisfies Prisma.SalesOrdersWhereInput;
}

async function paymentTotal(
	ctx: TRPCContext,
	userId: number,
	range: { from: Date; to: Date },
) {
	const result = await ctx.db.salesPayments.aggregate({
		_sum: { amount: true },
		where: {
			deletedAt: null,
			status: { in: [...SUCCESSFUL_PAYMENT_STATUSES] },
			createdAt: { gte: range.from, lte: range.to },
			order: {
				is: {
					deletedAt: null,
					type: "order",
					salesRepId: userId,
				},
			},
		},
	});

	return result._sum.amount ?? 0;
}

async function receivableSnapshot(ctx: TRPCContext, userId: number) {
	const orders = await ctx.db.salesOrders.findMany({
		where: {
			deletedAt: null,
			type: "order",
			salesRepId: userId,
		},
		select: {
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
			payments: {
				where: { deletedAt: null },
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
		},
	});
	const receivables = orders.map((order) =>
		projectSalesFinanceReceivable(order),
	);

	return {
		summary: summarizeSalesFinanceReceivables(receivables),
		overdue: receivables
			.filter((item) => item.amountDue > 0 && item.isOverdue)
			.sort(
				(a, b) =>
					(b.daysOverdue ?? 0) - (a.daysOverdue ?? 0) ||
					b.amountDue - a.amountDue,
			)
			.slice(0, 4)
			.map((item) => ({
				id: item.id,
				orderNo: item.orderNo,
				customerName: item.customerName || "Walk-in customer",
				amountDue: item.amountDue,
				daysOverdue: item.daysOverdue ?? 0,
			})),
	};
}

export async function getSalesRepDashboardOverview(
	ctx: TRPCContext,
	userId: number,
	input: SalesRepDashboardPeriodInput,
) {
	const period = resolveSalesReportingPeriod(input);
	const previousPeriod = getPreviousSalesReportingPeriod(input);
	const expiringQuoteTo = addDays(new Date(), 7);

	const [
		profile,
		kpis,
		currentPayments,
		previousPayments,
		commissionEarned,
		commissionPaid,
		pendingCommission,
		receivables,
		dealerRequestRows,
		expiringQuoteCount,
		expiringQuotes,
		urgentOrderCount,
		urgentOrders,
	] = await Promise.all([
		ctx.db.users.findUnique({
			where: { id: userId },
			select: { name: true },
		}),
		getKpis(ctx, { ...input, salesRepIds: [userId] }),
		paymentTotal(ctx, userId, period),
		paymentTotal(ctx, userId, previousPeriod),
		ctx.db.salesCommision.aggregate({
			_sum: { amount: true },
			where: {
				deletedAt: null,
				userId,
				createdAt: { gte: period.from, lte: period.to },
			},
		}),
		ctx.db.salesCommision.aggregate({
			_sum: { amount: true },
			where: {
				deletedAt: null,
				userId,
				commissionPaymentId: { not: null },
				createdAt: { gte: period.from, lte: period.to },
			},
		}),
		ctx.db.salesCommision.aggregate({
			_sum: { amount: true },
			_count: { _all: true },
			where: {
				deletedAt: null,
				userId,
				commissionPaymentId: null,
			},
		}),
		receivableSnapshot(ctx, userId),
		ctx.db.dealerSalesRequest.findMany({
			where: {
				request: DEALER_ORDER_REQUEST_TYPE,
				deletedAt: null,
				sale: { salesRepId: userId },
			},
			select: {
				status: true,
				createdAt: true,
				updatedAt: true,
			},
		}),
		ctx.db.salesOrders.count({
			where: {
				deletedAt: null,
				type: "quote",
				salesRepId: userId,
				goodUntil: { gte: new Date(), lte: expiringQuoteTo },
			},
		}),
		ctx.db.salesOrders.findMany({
			where: {
				deletedAt: null,
				type: "quote",
				salesRepId: userId,
				goodUntil: { gte: new Date(), lte: expiringQuoteTo },
			},
			orderBy: [{ goodUntil: "asc" }, { id: "desc" }],
			take: 4,
			select: {
				id: true,
				orderId: true,
				goodUntil: true,
				grandTotal: true,
				customer: {
					select: { name: true, businessName: true },
				},
			},
		}),
		ctx.db.salesOrders.count({
			where: {
				...activeOrderWhere(userId),
				priority: { in: ["CRITICAL", "HIGH"] },
			},
		}),
		ctx.db.salesOrders.findMany({
			where: {
				...activeOrderWhere(userId),
				priority: { in: ["CRITICAL", "HIGH"] },
			},
			orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
			take: 4,
			select: {
				id: true,
				orderId: true,
				priority: true,
				status: true,
				grandTotal: true,
				customer: {
					select: { name: true, businessName: true },
				},
			},
		}),
	]);

	const firstName = profile?.name?.trim().split(/\s+/)[0] || "there";
	const dealerRequests = summarizeDealerRequestSla(dealerRequestRows);

	return {
		firstName,
		period: kpis.period,
		kpis: {
			bookedSales: kpis.bookedSales,
			orderCount: kpis.orderCount,
			quoteCount: kpis.quoteCount,
			averageOrderValue: kpis.averageOrderValue,
			change: kpis.change,
		},
		payments: {
			applied: currentPayments,
			change: calculateReportingChange(currentPayments, previousPayments),
		},
		commissions: {
			earned: commissionEarned._sum.amount ?? 0,
			paid: commissionPaid._sum.amount ?? 0,
			pending: pendingCommission._sum.amount ?? 0,
			pendingCount: pendingCommission._count._all,
		},
		receivables: receivables.summary,
		requests: dealerRequests,
		attention: {
			total:
				receivables.summary.bucketCounts["1_30"] +
				receivables.summary.bucketCounts["31_60"] +
				receivables.summary.bucketCounts["61_90"] +
				receivables.summary.bucketCounts["90_plus"] +
				expiringQuoteCount +
				urgentOrderCount +
				dealerRequests.pending,
			expiringQuoteCount,
			urgentOrderCount,
			overdueReceivables: receivables.overdue,
			expiringQuotes: expiringQuotes.map((quote) => ({
				id: quote.id,
				orderNo: quote.orderId,
				goodUntil: quote.goodUntil,
				grandTotal: quote.grandTotal ?? 0,
				customerName: customerName(quote.customer),
			})),
			urgentOrders: urgentOrders.map((order) => ({
				id: order.id,
				orderNo: order.orderId,
				priority: order.priority,
				status: order.status,
				grandTotal: order.grandTotal ?? 0,
				customerName: customerName(order.customer),
			})),
		},
	};
}

export async function getSalesRepDashboardTrend(
	ctx: TRPCContext,
	userId: number,
	input: SalesRepDashboardPeriodInput,
) {
	return getRevenueOverTime(ctx, { ...input, salesRepIds: [userId] });
}

export async function getSalesRepDashboardActivity(
	ctx: TRPCContext,
	userId: number,
	input: SalesRepDashboardPeriodInput,
) {
	const period = resolveSalesReportingPeriod(input);
	const [orders, quotes, payments, commissions, dealerRequests] =
		await Promise.all([
			ctx.db.salesOrders.findMany({
				where: {
					deletedAt: null,
					type: "order",
					salesRepId: userId,
					createdAt: { gte: period.from, lte: period.to },
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: 6,
				select: {
					id: true,
					orderId: true,
					createdAt: true,
					grandTotal: true,
					customer: { select: { name: true, businessName: true } },
				},
			}),
			ctx.db.salesOrders.findMany({
				where: {
					deletedAt: null,
					type: "quote",
					salesRepId: userId,
					createdAt: { gte: period.from, lte: period.to },
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: 6,
				select: {
					id: true,
					orderId: true,
					createdAt: true,
					grandTotal: true,
					customer: { select: { name: true, businessName: true } },
				},
			}),
			ctx.db.salesPayments.findMany({
				where: {
					deletedAt: null,
					status: { in: [...SUCCESSFUL_PAYMENT_STATUSES] },
					createdAt: { gte: period.from, lte: period.to },
					order: {
						is: { deletedAt: null, type: "order", salesRepId: userId },
					},
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: 6,
				select: {
					id: true,
					amount: true,
					createdAt: true,
					order: {
						select: {
							orderId: true,
							customer: {
								select: { name: true, businessName: true },
							},
						},
					},
				},
			}),
			ctx.db.salesCommision.findMany({
				where: {
					deletedAt: null,
					userId,
					createdAt: { gte: period.from, lte: period.to },
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: 6,
				select: {
					id: true,
					amount: true,
					createdAt: true,
					commissionPaymentId: true,
					order: { select: { orderId: true } },
				},
			}),
			ctx.db.dealerSalesRequest.findMany({
				where: {
					request: DEALER_ORDER_REQUEST_TYPE,
					deletedAt: null,
					sale: { salesRepId: userId },
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: 6,
				select: {
					id: true,
					status: true,
					createdAt: true,
					sale: {
						select: {
							orderId: true,
							grandTotal: true,
							customer: {
								select: { name: true, businessName: true },
							},
							dealerAuth: {
								select: { name: true, companyName: true },
							},
						},
					},
				},
			}),
		]);

	const items = [
		...orders.map((order) => ({
			id: `order-${order.id}`,
			type: "order" as const,
			title: `Order ${order.orderId}`,
			description: customerName(order.customer),
			amount: order.grandTotal ?? 0,
			occurredAt: order.createdAt,
			orderNo: order.orderId,
		})),
		...quotes.map((quote) => ({
			id: `quote-${quote.id}`,
			type: "quote" as const,
			title: `Quote ${quote.orderId}`,
			description: customerName(quote.customer),
			amount: quote.grandTotal ?? 0,
			occurredAt: quote.createdAt,
			orderNo: quote.orderId,
		})),
		...payments.map((payment) => ({
			id: `payment-${payment.id}`,
			type: "payment" as const,
			title: `Payment applied to ${payment.order.orderId}`,
			description: customerName(payment.order.customer),
			amount: payment.amount,
			occurredAt: payment.createdAt,
			orderNo: payment.order.orderId,
		})),
		...commissions.map((commission) => ({
			id: `commission-${commission.id}`,
			type: "commission" as const,
			title: commission.commissionPaymentId
				? "Commission paid"
				: "Commission earned",
			description: `Order ${commission.order.orderId}`,
			amount: commission.amount,
			occurredAt: commission.createdAt,
			orderNo: commission.order.orderId,
		})),
		...dealerRequests.map((request) => ({
			id: `request-${request.id}`,
			type: "request" as const,
			title: `Dealer request ${request.status}`,
			description:
				request.sale.dealerAuth?.companyName ||
				request.sale.dealerAuth?.name ||
				customerName(request.sale.customer) ||
				request.sale.orderId,
			amount: request.sale.grandTotal ?? 0,
			occurredAt: request.createdAt,
			orderNo: request.sale.orderId,
		})),
	]
		.filter((item) => item.occurredAt)
		.sort(
			(a, b) =>
				new Date(b.occurredAt as Date).getTime() -
				new Date(a.occurredAt as Date).getTime(),
		)
		.slice(0, 10);

	return { items };
}
