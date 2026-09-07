export function evaluateSalesPipelineCutoverGates(input: {
	comparedOrders: number;
	unexplainedMembershipDifferences: number;
	unsafeTransitionDifferences: number;
	staleProjectionDifferences: number;
	p95LatencyMs: number;
	maxP95LatencyMs: number;
	conflictSampleComplete: boolean;
	operatorApproved: boolean;
}) {
	const reconciliationCountsValid =
		Number.isSafeInteger(input.comparedOrders) &&
		input.comparedOrders >= 0 &&
		Number.isSafeInteger(input.unsafeTransitionDifferences) &&
		input.unsafeTransitionDifferences >= 0 &&
		input.unsafeTransitionDifferences <= input.comparedOrders;
	const failures = [
		...(reconciliationCountsValid ? [] : ["INVALID_RECONCILIATION_COUNTS"]),
		...(input.unexplainedMembershipDifferences === 0
			? []
			: ["UNEXPLAINED_MEMBERSHIP_DIFFERENCES"]),
		...(input.staleProjectionDifferences === 0
			? []
			: ["STALE_PROJECTION_DIFFERENCES"]),
		...(input.p95LatencyMs <= input.maxP95LatencyMs
			? []
			: ["LATENCY_GATE_FAILED"]),
		...(input.operatorApproved ? [] : ["OPERATOR_APPROVAL_REQUIRED"]),
	];
	return {
		passed: failures.length === 0,
		failures,
		reconciliation: {
			comparedOrders: input.comparedOrders,
			acceptedOrders: reconciliationCountsValid
				? input.comparedOrders - input.unsafeTransitionDifferences
				: 0,
			informationalExceptionOrders: input.unsafeTransitionDifferences,
			conflictSampleComplete: input.conflictSampleComplete,
			requiresAutomaticRepair: false,
		},
	};
}
