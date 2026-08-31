import type { StickyColumnConfig } from "@/components/tables-2/core";

type SalesProductionColumnContext = {
	tab: string;
	view: string;
	list: Record<string, string | number>;
};

export function getActiveSalesProductionStickyColumns(
	stickyColumns: StickyColumnConfig[],
	columnIds: string[],
) {
	const activeColumnIds = new Set(columnIds);
	return stickyColumns.filter((column) => activeColumnIds.has(column.id));
}

export function shouldShowSalesProductionOrderDate({
	tab,
	view,
	list,
}: SalesProductionColumnContext) {
	return (
		tab === "queue" &&
		view === "table" &&
		(!list.show || list.show === "unscheduled")
	);
}

export function placeOrderDateAfterDueDate(
	columnOrder: string[],
	columnIds: string[],
) {
	const sourceOrder = columnOrder.length > 0 ? columnOrder : columnIds;
	const orderWithoutOrderDate = sourceOrder.filter((id) => id !== "orderDate");
	const dueDateIndex = orderWithoutOrderDate.indexOf("dueDate");

	if (dueDateIndex === -1 || !columnIds.includes("orderDate")) {
		return columnOrder;
	}

	return [
		...orderWithoutOrderDate.slice(0, dueDateIndex + 1),
		"orderDate",
		...orderWithoutOrderDate.slice(dueDateIndex + 1),
	];
}
