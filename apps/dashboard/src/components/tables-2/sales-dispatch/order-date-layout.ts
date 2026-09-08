export function placeDispatchOrderDate(
	columnOrder: string[],
	columnIds: string[],
) {
	const order = (columnOrder.length ? columnOrder : columnIds).filter(
		(id) => id !== "orderDate",
	);
	const schedule = order.findIndex(
		(id) => id === "dueDate" || id === "completedAt",
	);
	if (schedule < 0 || !columnIds.includes("orderDate")) return columnOrder;
	return [
		...order.slice(0, schedule + 1),
		"orderDate",
		...order.slice(schedule + 1),
	];
}
