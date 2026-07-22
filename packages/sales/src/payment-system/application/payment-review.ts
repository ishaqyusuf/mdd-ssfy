import type { Db, TransactionClient } from "@gnd/db";
import type { SalesPaymentMethods } from "../../constants";

export const SALES_PAYMENT_REVIEW_STATUSES = [
	"needs_review",
	"reviewed",
] as const;
export type SalesPaymentReviewStatus =
	(typeof SALES_PAYMENT_REVIEW_STATUSES)[number];

export const SALES_PAYMENT_ORIGINS = ["online", "office"] as const;
export type SalesPaymentOrigin = (typeof SALES_PAYMENT_ORIGINS)[number];

export const SALES_PAYMENT_REVIEW_ACTIONS = [
	"production",
	"fulfillment",
	"inbound",
] as const;
export type SalesPaymentReviewAction =
	(typeof SALES_PAYMENT_REVIEW_ACTIONS)[number];

export type SalesPaymentReviewSettings = {
	autoReviewActions?: Partial<Record<SalesPaymentReviewAction, boolean>>;
};

export type ReviewedSalesPayment = {
	paymentId: number;
	salesId: number;
	orderId: string;
	type: "order" | "quote";
};

export type SkippedSalesPaymentReview = {
	salesId: number;
	reason: "no_payment_needs_review";
};

export type BatchSalesPaymentReviewResult = {
	reviewed: ReviewedSalesPayment[];
	skipped: SkippedSalesPaymentReview[];
};

const REVIEWABLE_PAYMENT_STATUSES = new Set(["success", "completed", "paid"]);

export function isReviewableSalesPaymentStatus(status?: string | null) {
	return REVIEWABLE_PAYMENT_STATUSES.has(String(status || "").toLowerCase());
}

export function resolveSalesPaymentOrigin(
	paymentMethod?: SalesPaymentMethods | string | null,
): SalesPaymentOrigin {
	return paymentMethod === "link" ? "online" : "office";
}

export function defaultSalesPaymentReviewSettings(): Required<SalesPaymentReviewSettings> {
	return {
		autoReviewActions: {
			production: false,
			fulfillment: false,
			inbound: false,
		},
	};
}

export function normalizeSalesPaymentReviewSettings(
	value?: SalesPaymentReviewSettings | null,
): Required<SalesPaymentReviewSettings> {
	const defaults = defaultSalesPaymentReviewSettings();
	return {
		autoReviewActions: {
			production: value?.autoReviewActions?.production ?? false,
			fulfillment: value?.autoReviewActions?.fulfillment ?? false,
			inbound: value?.autoReviewActions?.inbound ?? false,
		},
	};
}

export async function markLatestSalesPaymentReviewed(
	db: Db | TransactionClient,
	input: {
		salesId: number;
		reviewedById?: number | null;
		reviewMethod?: "manual" | "auto";
		reviewedByAction?: SalesPaymentReviewAction | null;
		reviewNote?: string | null;
	},
) {
	const payment = await db.salesPayments.findFirst({
		where: {
			orderId: input.salesId,
			deletedAt: null,
			reviewStatus: "needs_review",
			status: {
				in: ["success", "completed", "paid"],
			},
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
		},
	});

	if (!payment) return null;

	return db.salesPayments.update({
		where: {
			id: payment.id,
		},
		data: {
			reviewStatus: "reviewed",
			reviewMethod: input.reviewMethod || "manual",
			reviewedByAction: input.reviewedByAction || null,
			reviewedAt: new Date(),
			reviewedById: input.reviewedById ?? null,
			reviewNote: input.reviewNote || null,
		},
		select: {
			id: true,
			orderId: true,
			order: {
				select: {
					id: true,
					orderId: true,
					type: true,
				},
			},
			reviewStatus: true,
			reviewMethod: true,
			reviewedByAction: true,
			reviewedAt: true,
		},
	});
}

export async function markSalesPaymentsReviewed(
	db: Db,
	input: {
		salesIds: readonly number[];
		reviewedById?: number | null;
		reviewNote?: string | null;
	},
): Promise<BatchSalesPaymentReviewResult> {
	const salesIds = Array.from(new Set(input.salesIds));
	if (!salesIds.length) {
		return {
			reviewed: [],
			skipped: [],
		};
	}

	return db.$transaction(async (tx) => {
		const payments = await tx.salesPayments.findMany({
			where: {
				orderId: {
					in: salesIds,
				},
				deletedAt: null,
				reviewStatus: "needs_review",
				status: {
					in: ["success", "completed", "paid"],
				},
			},
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			select: {
				id: true,
				orderId: true,
				order: {
					select: {
						id: true,
						orderId: true,
						type: true,
					},
				},
			},
		});
		const latestPayments = new Map<number, (typeof payments)[number]>();
		for (const payment of payments) {
			if (!latestPayments.has(payment.orderId)) {
				latestPayments.set(payment.orderId, payment);
			}
		}

		const reviewedPayments: (typeof payments)[number][] = [];
		for (const payment of latestPayments.values()) {
			const update = await tx.salesPayments.updateMany({
				where: {
					id: payment.id,
					reviewStatus: "needs_review",
				},
				data: {
					reviewStatus: "reviewed",
					reviewMethod: "manual",
					reviewedByAction: null,
					reviewedAt: new Date(),
					reviewedById: input.reviewedById ?? null,
					reviewNote: input.reviewNote || null,
				},
			});
			if (update.count > 0) {
				reviewedPayments.push(payment);
			}
		}
		const reviewedSalesIds = new Set(
			reviewedPayments.map((payment) => payment.orderId),
		);

		return {
			reviewed: reviewedPayments.map((payment) => ({
				paymentId: payment.id,
				salesId: payment.order.id,
				orderId: payment.order.orderId,
				type: payment.order.type === "quote" ? "quote" : "order",
			})),
			skipped: salesIds
				.filter((salesId) => !reviewedSalesIds.has(salesId))
				.map((salesId) => ({
					salesId,
					reason: "no_payment_needs_review" as const,
				})),
		};
	});
}

export async function autoReviewSalesPaymentsForOrderAction(
	db: Db | TransactionClient,
	input: {
		salesId: number;
		action: SalesPaymentReviewAction;
		settings?: SalesPaymentReviewSettings | null;
		reviewedById?: number | null;
		reviewNote?: string | null;
	},
) {
	const settings = normalizeSalesPaymentReviewSettings(input.settings);
	if (!settings.autoReviewActions[input.action]) {
		return { count: 0 };
	}

	return db.salesPayments.updateMany({
		where: {
			orderId: input.salesId,
			deletedAt: null,
			reviewStatus: "needs_review",
			status: {
				in: ["success", "completed", "paid"],
			},
		},
		data: {
			reviewStatus: "reviewed",
			reviewMethod: "auto",
			reviewedByAction: input.action,
			reviewedAt: new Date(),
			reviewedById: input.reviewedById ?? null,
			reviewNote: input.reviewNote || null,
		},
	});
}
