type PayableJob = {
	id?: number;
	amount?: number | null;
};

export function getPaymentSelection<T extends PayableJob>(
	jobs: T[],
	rowSelection: Record<string, boolean>,
	chargePercentage: number,
) {
	// The reviewed rows are also the authority for the submitted IDs.
	const selectedJobs = jobs.filter(
		(job): job is T & { id: number } =>
			Number.isSafeInteger(job.id) &&
			Number(job.id) > 0 &&
			!!rowSelection[String(job.id)],
	);
	const selectedTotal = Number(
		selectedJobs
			.reduce((sum, job) => sum + Number(job.amount || 0), 0)
			.toFixed(2),
	);
	const discountValue = Number(
		(selectedTotal * (chargePercentage / 100)).toFixed(2),
	);
	return {
		selectedJobs,
		selectedJobIds: selectedJobs.map((job) => job.id),
		selectedTotal,
		chargePercentage,
		discountValue,
		totalPayout: Number((selectedTotal - discountValue).toFixed(2)),
	};
}
