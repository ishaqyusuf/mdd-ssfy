import { TableSkeleton } from "@/components/tables/skeleton";

interface DataTableLoadingProps {
	columnCount: number;
	rowCount?: number;
	isNewRowCreatable?: boolean;
	isRowsDeletable?: boolean;
}

export function DataTableLoading({
	columnCount,
	rowCount = 10,
	isNewRowCreatable = false,
	isRowsDeletable = false,
}: DataTableLoadingProps) {
	return (
		<TableSkeleton
			columns={columnCount}
			rows={rowCount}
			showToolbar={isNewRowCreatable || isRowsDeletable}
			showPagination
			className="px-3 py-4 md:px-8"
		/>
	);
}
