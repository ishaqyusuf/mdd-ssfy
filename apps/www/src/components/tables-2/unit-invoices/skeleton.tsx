import { TableSkeleton } from "@/components/tables-2/core";
import { STICKY_COLUMNS } from "@/utils/table-configs";
import type { TableSettings } from "@/utils/table-settings";
import type { ColumnDef } from "@tanstack/react-table";

import { type UnitInvoiceRow, columns } from "./columns";

type Props = {
	initialSettings?: Partial<TableSettings>;
	rowCount?: number;
	isEmpty?: boolean;
	columns?: ColumnDef<UnitInvoiceRow>[];
};

export function UnitInvoicesSkeleton({
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
			stickyColumnIds={STICKY_COLUMNS["unit-invoices"].map(({ id }) => id)}
		/>
	);
}
