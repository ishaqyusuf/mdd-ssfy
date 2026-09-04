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

export function getNextProductionItemExpansion({
	currentItemUids,
	itemUid,
	itemUids,
	singleOpen,
}: {
	currentItemUids: string[];
	itemUid: string;
	itemUids: string[];
	singleOpen: boolean;
}) {
	if (!itemUids.includes(itemUid)) {
		return {
			expandedItemUids: currentItemUids,
			requestedItemUid: currentItemUids.at(-1) ?? null,
		};
	}

	const isOpen = currentItemUids.includes(itemUid);
	const expandedItemUids = singleOpen
		? isOpen
			? []
			: [itemUid]
		: isOpen
			? currentItemUids.filter((uid) => uid !== itemUid)
			: [...currentItemUids, itemUid];

	return {
		expandedItemUids,
		requestedItemUid: isOpen ? (expandedItemUids.at(-1) ?? null) : itemUid,
	};
}
