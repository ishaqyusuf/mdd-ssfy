import type { StickyColumnConfig } from "@/components/tables-2/core";
import type { VisibilityState } from "@tanstack/react-table";

type SalesProductionColumnContext = {
	tab: string;
	view: string;
	list: Record<string, unknown>;
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

export function getSalesProductionColumnVisibility(props: {
	columnVisibility: VisibilityState;
	context: SalesProductionColumnContext;
	workerMode?: boolean;
}) {
	const completed =
		props.context.tab === "completed" ||
		props.context.list.production === "completed";

	return {
		...props.columnVisibility,
		orderDate:
			!props.workerMode && shouldShowSalesProductionOrderDate(props.context),
		materials:
			completed && props.columnVisibility.materials === undefined
				? false
				: props.columnVisibility.materials,
	};
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
