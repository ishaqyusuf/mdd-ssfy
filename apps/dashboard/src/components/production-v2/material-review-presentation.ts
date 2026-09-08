export function selectMaterialReview(input: {
	orderContext: boolean;
	selectedId: number | null;
	requestedId: number | null;
	reviewIds: number[];
}) {
	if (input.requestedId) return input.requestedId;
	if (input.selectedId && input.reviewIds.includes(input.selectedId))
		return input.selectedId;
	return input.orderContext ? (input.reviewIds[0] ?? null) : null;
}
