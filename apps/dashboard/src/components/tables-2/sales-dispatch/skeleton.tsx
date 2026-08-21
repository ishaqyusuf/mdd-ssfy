"use client";

import { TableSkeleton } from "@/components/tables-2/core";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import type { TableSettings } from "@/utils/table-settings";

import { columns, compactColumns, driverColumns } from "./columns";

const defaultTableConfig = TABLE_CONFIGS["sales-dispatch"];
const compactTableConfig = {
	...defaultTableConfig,
	rowHeight: TABLE_CONFIGS["sales-orders"].rowHeight,
};

type Props = {
	initialSettings?: Partial<TableSettings>;
	rowCount?: number;
	isEmpty?: boolean;
	driver?: boolean;
	compact?: boolean;
};

export function SalesDispatchSkeleton({
	initialSettings,
	rowCount,
	isEmpty,
	driver,
	compact = false,
}: Props) {
	const tableConfig = compact ? compactTableConfig : defaultTableConfig;
	const resolvedColumns = driver
		? driverColumns
		: compact
			? compactColumns
			: columns;

	return (
		<TableSkeleton
			columns={resolvedColumns}
			rowCount={rowCount}
			isEmpty={isEmpty}
			columnVisibility={initialSettings?.columns}
			columnSizing={initialSettings?.sizing}
			columnOrder={initialSettings?.order}
			tableConfig={tableConfig}
		/>
	);
}
