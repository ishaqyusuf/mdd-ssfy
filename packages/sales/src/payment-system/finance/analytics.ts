import { addMoney } from "../domain/money";
import {
	SALES_FINANCE_EXCEPTION_CODES,
	type SalesFinanceExceptionCode,
	type SalesFinancePaymentMethod,
	type SalesFinanceTransaction,
} from "./projection";

const DAY_MS = 24 * 60 * 60 * 1000;

export const SALES_FINANCE_ANALYTICS_MAX_DAYS = 3_653;

export type SalesFinanceTrendGranularity = "day" | "week" | "month";

export type SalesFinanceTrendPoint = {
	periodStart: Date;
	periodEnd: Date;
	receivedAmount: number;
	refundedAmount: number;
	netAmount: number;
	transactionCount: number;
};

export type SalesFinanceMethodMixPoint = {
	paymentMethod: SalesFinancePaymentMethod;
	transactionCount: number;
	receivedAmount: number;
	refundedAmount: number;
	netAmount: number;
	share: number;
};

export const SALES_FINANCE_REVIEW_AGE_BUCKETS = [
	"0_7_days",
	"8_14_days",
	"15_30_days",
	"31_plus_days",
] as const;

export type SalesFinanceReviewAgeBucket =
	(typeof SALES_FINANCE_REVIEW_AGE_BUCKETS)[number];

export type SalesFinanceReviewAgePoint = {
	bucket: SalesFinanceReviewAgeBucket;
	transactionCount: number;
	exposureAmount: number;
};

export type SalesFinanceReviewReasonPoint = {
	code: SalesFinanceExceptionCode;
	transactionCount: number;
	exposureAmount: number;
};

function utcDay(value: Date) {
	return Date.UTC(
		value.getUTCFullYear(),
		value.getUTCMonth(),
		value.getUTCDate(),
	);
}

export function getSalesFinanceAnalyticsRangeDays(from: Date, to: Date) {
	return Math.max(1, Math.floor((utcDay(to) - utcDay(from)) / DAY_MS) + 1);
}

function getTrendGranularity(rangeDays: number): SalesFinanceTrendGranularity {
	if (rangeDays <= 45) return "day";
	if (rangeDays <= 365) return "week";
	return "month";
}

function monthKey(value: Date) {
	return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function createTrendBuckets(
	from: Date,
	to: Date,
	granularity: SalesFinanceTrendGranularity,
) {
	const fromDay = utcDay(from);
	const toDay = utcDay(to);
	const points: SalesFinanceTrendPoint[] = [];

	if (granularity === "month") {
		let cursor = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1);

		while (cursor <= toDay) {
			const cursorDate = new Date(cursor);
			const nextMonth = Date.UTC(
				cursorDate.getUTCFullYear(),
				cursorDate.getUTCMonth() + 1,
				1,
			);
			points.push({
				periodStart: new Date(Math.max(cursor, fromDay)),
				periodEnd: new Date(Math.min(nextMonth - DAY_MS, toDay)),
				receivedAmount: 0,
				refundedAmount: 0,
				netAmount: 0,
				transactionCount: 0,
			});
			cursor = nextMonth;
		}

		return points;
	}

	const bucketDays = granularity === "week" ? 7 : 1;
	for (let cursor = fromDay; cursor <= toDay; cursor += bucketDays * DAY_MS) {
		points.push({
			periodStart: new Date(cursor),
			periodEnd: new Date(Math.min(cursor + (bucketDays - 1) * DAY_MS, toDay)),
			receivedAmount: 0,
			refundedAmount: 0,
			netAmount: 0,
			transactionCount: 0,
		});
	}

	return points;
}

function findTrendIndex(
	receivedAt: Date,
	from: Date,
	granularity: SalesFinanceTrendGranularity,
	monthIndexes: Map<string, number>,
) {
	if (granularity === "month") {
		return monthIndexes.get(monthKey(receivedAt)) ?? -1;
	}

	const daysFromStart = Math.floor(
		(utcDay(receivedAt) - utcDay(from)) / DAY_MS,
	);
	return Math.floor(daysFromStart / (granularity === "week" ? 7 : 1));
}

function reviewAgeBucket(days: number): SalesFinanceReviewAgeBucket {
	if (days <= 7) return "0_7_days";
	if (days <= 14) return "8_14_days";
	if (days <= 30) return "15_30_days";
	return "31_plus_days";
}

export function buildSalesFinanceAnalytics(input: {
	transactions: SalesFinanceTransaction[];
	from: Date;
	to: Date;
}) {
	const rangeDays = getSalesFinanceAnalyticsRangeDays(input.from, input.to);
	const granularity = getTrendGranularity(rangeDays);
	const trend = createTrendBuckets(input.from, input.to, granularity);
	const monthIndexes = new Map(
		trend.map((point, index) => [monthKey(point.periodStart), index]),
	);
	const methodTotals = new Map<
		SalesFinancePaymentMethod,
		Omit<SalesFinanceMethodMixPoint, "share">
	>();
	const reviewAge = new Map<
		SalesFinanceReviewAgeBucket,
		SalesFinanceReviewAgePoint
	>(
		SALES_FINANCE_REVIEW_AGE_BUCKETS.map((bucket) => [
			bucket,
			{ bucket, transactionCount: 0, exposureAmount: 0 },
		]),
	);
	const reviewReasons = new Map<
		SalesFinanceExceptionCode,
		SalesFinanceReviewReasonPoint
	>(
		SALES_FINANCE_EXCEPTION_CODES.map((code) => [
			code,
			{ code, transactionCount: 0, exposureAmount: 0 },
		]),
	);

	for (const transaction of input.transactions) {
		if (transaction.receivedAt) {
			const trendIndex = findTrendIndex(
				transaction.receivedAt,
				input.from,
				granularity,
				monthIndexes,
			);
			const point = trend[trendIndex];

			if (point) {
				point.transactionCount += 1;
				point.receivedAmount = addMoney(
					point.receivedAmount,
					transaction.receivedAmount,
				);
				point.refundedAmount = addMoney(
					point.refundedAmount,
					transaction.refundedAmount,
				);
				point.netAmount = addMoney(point.netAmount, transaction.netAmount);
			}
		}

		const method = methodTotals.get(transaction.paymentMethod) || {
			paymentMethod: transaction.paymentMethod,
			transactionCount: 0,
			receivedAmount: 0,
			refundedAmount: 0,
			netAmount: 0,
		};
		method.transactionCount += 1;
		method.receivedAmount = addMoney(
			method.receivedAmount,
			transaction.receivedAmount,
		);
		method.refundedAmount = addMoney(
			method.refundedAmount,
			transaction.refundedAmount,
		);
		method.netAmount = addMoney(method.netAmount, transaction.netAmount);
		methodTotals.set(transaction.paymentMethod, method);

		if (!transaction.needsReview) continue;

		const ageDays = transaction.receivedAt
			? Math.max(
					0,
					Math.floor(
						(utcDay(input.to) - utcDay(transaction.receivedAt)) / DAY_MS,
					),
				)
			: 0;
		const age = reviewAge.get(reviewAgeBucket(ageDays));
		if (age) {
			age.transactionCount += 1;
			age.exposureAmount = addMoney(age.exposureAmount, transaction.netAmount);
		}

		for (const code of transaction.exceptionCodes) {
			const reason = reviewReasons.get(code);
			if (!reason) continue;
			reason.transactionCount += 1;
			reason.exposureAmount = addMoney(
				reason.exposureAmount,
				transaction.netAmount,
			);
		}
	}

	const totalReceived = Array.from(methodTotals.values()).reduce(
		(total, method) => addMoney(total, method.receivedAmount),
		0,
	);
	const methodMix: SalesFinanceMethodMixPoint[] = Array.from(
		methodTotals.values(),
	)
		.map((method) => ({
			...method,
			share:
				totalReceived > 0
					? Math.round((method.receivedAmount / totalReceived) * 10_000) / 100
					: 0,
		}))
		.sort((left, right) => right.receivedAmount - left.receivedAmount);

	return {
		period: {
			from: input.from,
			to: input.to,
			rangeDays,
			granularity,
		},
		transactionCount: input.transactions.length,
		reviewCount: input.transactions.filter(
			(transaction) => transaction.needsReview,
		).length,
		trend,
		methodMix,
		reviewAge: SALES_FINANCE_REVIEW_AGE_BUCKETS.map(
			(bucket) =>
				reviewAge.get(bucket) || {
					bucket,
					transactionCount: 0,
					exposureAmount: 0,
				},
		),
		reviewReasons: Array.from(reviewReasons.values())
			.filter((reason) => reason.transactionCount > 0)
			.sort((left, right) => right.transactionCount - left.transactionCount),
	};
}

export type SalesFinanceAnalytics = ReturnType<
	typeof buildSalesFinanceAnalytics
>;
