export function getProductionSubmissionDeleteRestriction({
	deliveredQuantity,
	dispatchMode,
}: {
	deliveredQuantity: number;
	dispatchMode: boolean;
}) {
	if (deliveredQuantity > 0) {
		return "This submission contains shipped items and can no longer be deleted.";
	}
	if (dispatchMode) {
		return "This submission cannot be deleted while the order is in dispatch mode.";
	}

	return null;
}

export function getProductionAssignmentDeleteRestriction({
	orderFulfilled,
	dispatchMode,
}: {
	orderFulfilled: boolean;
	dispatchMode: boolean;
}) {
	if (orderFulfilled) {
		return "This assignment belongs to a fulfilled order and can no longer be deleted.";
	}
	if (dispatchMode) {
		return "This assignment cannot be deleted while the order is in dispatch mode.";
	}

	return null;
}
