import type { SalesQueryRef } from "@/lib/query-events/types";

type ReviewedPayment = {
	paymentId: number;
	salesId: number;
	orderId: string;
	type: string | null;
};

type SkippedPaymentReview = {
	salesId: number;
	reason: "no_payment_needs_review";
};

type BatchPaymentReviewResult = {
	reviewed: ReviewedPayment[];
	skipped: SkippedPaymentReview[];
};

export async function reviewSelectedPayments<
	TResult extends BatchPaymentReviewResult,
>({
	salesIds,
	review,
	invalidate,
}: {
	salesIds: number[];
	review: (input: {
		salesIds: number[];
		note: string;
	}) => Promise<TResult>;
	invalidate: (sales: readonly SalesQueryRef[]) => Promise<unknown> | unknown;
}) {
	const result = await review({
		salesIds,
		note: "Reviewed from batch Mark as menu.",
	});

	await invalidate(
		result.reviewed.map((payment) => ({
			orderNo: payment.orderId,
			salesId: payment.salesId,
			salesType: payment.type === "quote" ? "quote" : "order",
		})),
	);

	return result;
}
