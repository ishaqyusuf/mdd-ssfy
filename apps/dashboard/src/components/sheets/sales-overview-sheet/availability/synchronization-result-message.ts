export function synchronizationResultMessage(result: {
	remainingReviewCount: number;
	remainingMaterialQty?: number | null;
	remainingAllocationBlockCount?: number | null;
}) {
	if (
		result.remainingReviewCount > 0 ||
		(result.remainingMaterialQty ?? 0) > 0 ||
		(result.remainingAllocationBlockCount ?? 0) > 0
	)
		return "Available coverage was applied. Some assignments or material quantities still need attention.";
	return "Eligible material coverage and submitted work were synchronized.";
}
