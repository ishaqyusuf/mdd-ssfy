export const PAYMENT_PORTAL_PATH = "/contractors/jobs/payment-portal";

export function positiveId(value: unknown): number | null {
	if (typeof value === "string" && !/^\d+$/.test(value)) return null;
	if (typeof value !== "string" && typeof value !== "number") return null;
	const id = Number(value);
	return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function normalizeStatus(status: unknown) {
	return String(status || "")
		.trim()
		.toLowerCase()
		.replace(/[_\s]+/g, "-");
}

type PaymentJob = {
	id?: number;
	status?: string | null;
	payment?: { id?: number | null } | null;
	user?: { id?: number | null } | null;
};

export function getJobPaymentHandoff(job: PaymentJob) {
	const contractorId = positiveId(job.user?.id);
	const jobId = positiveId(job.id);
	const status = normalizeStatus(job.status);
	if (!contractorId || !jobId || job.payment?.id || status === "paid")
		return null;
	const isReview = status === "submitted";
	const isCancelled =
		status === "payment-cancelled" || status === "payment-canceled";
	if (
		!isReview &&
		!isCancelled &&
		status !== "approved" &&
		status !== "completed"
	)
		return null;
	const filter = isReview
		? "pending-review"
		: isCancelled
			? "payment-cancelled"
			: "ready-to-pay";
	const query = new URLSearchParams({
		contractorId: String(contractorId),
		jobId: String(jobId),
		status: filter,
	});
	return {
		href: `${PAYMENT_PORTAL_PATH}?${query}`,
		label: isReview ? "Review in payment portal" : "Prepare payment",
		isReview,
	};
}

export function readJobPaymentContext(params: {
	get: (key: string) => string | null;
}): {
	contractorId: number | null;
	jobId: number | null;
	status: "all" | "pending-review" | "ready-to-pay" | "payment-cancelled";
} {
	const contractorId = positiveId(params.get("contractorId"));
	const jobId = positiveId(params.get("jobId"));
	const rawStatus = params.get("status");
	const status =
		rawStatus === "pending-review" ||
		rawStatus === "ready-to-pay" ||
		rawStatus === "payment-cancelled"
			? rawStatus
			: "all";
	return { contractorId, jobId: contractorId ? jobId : null, status };
}

// Only fresh jobs returned by the contractor's unpaid portal query can be selected.
// Submitted jobs arrive in review mode without authorizing a payout selection.
export function getHandoffSelection(
	context: ReturnType<typeof readJobPaymentContext>,
	contractorId: number | null,
	jobs: readonly {
		id: number;
		status?: string | null;
		paymentStage?: string | null;
	}[],
) {
	if (!context.jobId || context.contractorId !== contractorId) return null;
	const job = jobs.find((item) => item.id === context.jobId);
	if (!job) return null;
	const status = normalizeStatus(job.status);
	if (
		(status === "approved" || status === "completed") &&
		job.paymentStage === "ready-to-pay"
	)
		return job.id;
	if (
		(status === "payment-cancelled" || status === "payment-canceled") &&
		job.paymentStage
	)
		return job.id;
	return null;
}
