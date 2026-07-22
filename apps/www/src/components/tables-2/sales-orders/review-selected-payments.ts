import type { SalesQueryRef } from "@/lib/query-events/types";
import type { BatchSalesPaymentReviewResult } from "@gnd/sales/payment-system";

export async function reviewSelectedPayments<
	TResult extends BatchSalesPaymentReviewResult,
>({
	salesIds,
	review,
	invalidate,
	onPaymentReviewed,
	closeMenu,
}: {
	salesIds: number[];
	review: (input: {
		salesIds: number[];
		note: string;
	}) => Promise<TResult>;
	invalidate: (sales: readonly SalesQueryRef[]) => Promise<unknown> | unknown;
	onPaymentReviewed?: () => void;
	closeMenu: () => void;
}) {
	const result = await review({
		salesIds,
		note: "Reviewed from batch Mark as menu.",
	});

	if (result.reviewed.length) {
		await invalidate(
			result.reviewed.map((payment) => ({
				orderNo: payment.orderId,
				salesId: payment.salesId,
				salesType: payment.type,
			})),
		);
	}

	onPaymentReviewed?.();
	closeMenu();

	return result;
}
