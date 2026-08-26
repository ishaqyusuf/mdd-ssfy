export const MAX_INBOUND_ATTENTION_BATCH_SIZE = 100;

export function toggleInboundAttentionSelection(
	selectedIds: number[],
	inboundId: number,
	selected: boolean,
) {
	if (selected) {
		if (selectedIds.length >= MAX_INBOUND_ATTENTION_BATCH_SIZE) {
			return selectedIds;
		}
		return selectedIds.includes(inboundId)
			? selectedIds
			: [...selectedIds, inboundId];
	}
	return selectedIds.filter((id) => id !== inboundId);
}

export function selectInboundAttentionBatch(inboundIds: number[]) {
	return Array.from(new Set(inboundIds)).slice(
		0,
		MAX_INBOUND_ATTENTION_BATCH_SIZE,
	);
}
