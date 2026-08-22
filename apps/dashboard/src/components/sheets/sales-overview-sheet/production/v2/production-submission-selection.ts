type PendingQuantity = {
	qty?: number | null;
	lh?: number | null;
	rh?: number | null;
};

export function hasPendingProductionQuantity(pending?: PendingQuantity | null) {
	return [pending?.qty, pending?.lh, pending?.rh]
		.map(Number)
		.some((quantity) => quantity > 0);
}

type SubmissionAssignment = {
	dueDate?: Date | string | null;
	pending?: PendingQuantity | null;
};

export function getEligibleProductionSubmissionAssignments<
	T extends SubmissionAssignment,
>(assignments: readonly T[]) {
	return assignments
		.map((assignment, index) => ({ assignment, index }))
		.filter(({ assignment }) =>
			hasPendingProductionQuantity(assignment.pending),
		)
		.sort(
			(left, right) =>
				dueDateValue(left.assignment.dueDate) -
				dueDateValue(right.assignment.dueDate),
		);
}

export function resolveProductionSubmissionAssignmentIndex(
	eligibleAssignments: readonly { index: number }[],
	requestedIndex: number | null,
) {
	return eligibleAssignments.some(({ index }) => index === requestedIndex)
		? requestedIndex
		: (eligibleAssignments[0]?.index ?? null);
}

function dueDateValue(value?: Date | string | null) {
	if (!value) return Number.POSITIVE_INFINITY;
	const timestamp = new Date(value).getTime();
	return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}
