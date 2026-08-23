type SubmissionQuantity = {
	qty?: number | null;
	lhQty?: number | null;
	rhQty?: number | null;
	materialReview?: { status?: string | null } | null;
};

type Quantity = { qty: number; lh: number; rh: number };

const emptyQuantity = (): Quantity => ({ qty: 0, lh: 0, rh: 0 });

function addQuantity(total: Quantity, submission: SubmissionQuantity) {
	total.qty += Number(submission.qty || 0);
	total.lh += Number(submission.lhQty || 0);
	total.rh += Number(submission.rhQty || 0);
}

export function splitProductionSubmissionQuantities(
	submissions: SubmissionQuantity[],
) {
	const finalized = emptyQuantity();
	const pendingReview = emptyQuantity();
	for (const submission of submissions) {
		const status = submission.materialReview?.status;
		if (!status || status === "APPROVED") addQuantity(finalized, submission);
		else if (status === "PENDING") addQuantity(pendingReview, submission);
	}
	return {
		finalized,
		pendingReview,
		reported: {
			qty: finalized.qty + pendingReview.qty,
			lh: finalized.lh + pendingReview.lh,
			rh: finalized.rh + pendingReview.rh,
		},
	};
}
