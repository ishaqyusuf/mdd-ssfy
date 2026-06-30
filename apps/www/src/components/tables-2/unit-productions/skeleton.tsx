import { TableSkeleton } from "@/components/tables-2/core";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import type { TableSettings } from "@/utils/table-settings";
import type { ColumnDef } from "@tanstack/react-table";

import { type UnitProductionRow, columns } from "./columns";

const tableConfig = TABLE_CONFIGS["unit-productions"];

type Props = {
	initialSettings?: Partial<TableSettings>;
	rowCount?: number;
	isEmpty?: boolean;
	columns?: ColumnDef<UnitProductionRow>[];
};

export function UnitProductionsSkeleton({
	initialSettings,
	rowCount = 12,
	isEmpty,
	columns: activeColumns = columns,
}: Props) {
	return (
		<TableSkeleton
			columns={activeColumns}
			rowCount={rowCount}
			isEmpty={isEmpty}
			columnVisibility={initialSettings?.columns}
			columnSizing={initialSettings?.sizing}
			columnOrder={initialSettings?.order}
			tableConfig={tableConfig}
		/>
	);
}
