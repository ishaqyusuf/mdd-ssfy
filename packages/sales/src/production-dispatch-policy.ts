export type ProductionDispatchMutationPolicyInput = {
	dispatchMode: boolean;
	hasPendingAssignmentQuantity: boolean;
	hasPendingSubmissionQuantity: boolean;
};

/**
 * Dispatch mode freezes structural production changes, but it must not freeze
 * completion of an assignment that already exists. A completed submission is
 * what creates the deliverable quantity consumed by packing.
 */
export function getProductionDispatchMutationPolicy({
	dispatchMode,
	hasPendingAssignmentQuantity,
	hasPendingSubmissionQuantity,
}: ProductionDispatchMutationPolicyInput) {
	return {
		canCreateAssignment: !dispatchMode && hasPendingAssignmentQuantity,
		canEditAssignment: !dispatchMode,
		canSubmitExistingAssignment: hasPendingSubmissionQuantity,
	};
}
