export function getInitialProductionItemExpansion({
	itemUids,
	requestedItemUid,
	singleOpen,
	workerMode,
}: {
	itemUids: string[];
	requestedItemUid?: string | null;
	singleOpen: boolean;
	workerMode: boolean;
}) {
	if (requestedItemUid && itemUids.includes(requestedItemUid)) {
		return [requestedItemUid];
	}

	return singleOpen || workerMode ? itemUids.slice(0, 1) : [];
}
