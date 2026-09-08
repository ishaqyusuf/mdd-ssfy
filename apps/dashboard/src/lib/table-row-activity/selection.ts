export function clearCompletedRowSelection(
	selection: Readonly<Record<string, boolean>>,
	completedUuids: ReadonlySet<string>,
) {
	if (![...completedUuids].some((uuid) => selection[uuid])) return selection;
	return Object.fromEntries(
		Object.entries(selection).filter(([uuid]) => !completedUuids.has(uuid)),
	);
}
