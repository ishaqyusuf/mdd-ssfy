"use client";

import { TableSkeleton } from "@/components/tables-2/core";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import type { TableSettings } from "@/utils/table-settings";

import { columns, driverColumns } from "./columns";

const tableConfig = TABLE_CONFIGS["sales-dispatch"];

type Props = {
	initialSettings?: Partial<TableSettings>;
	rowCount?: number;
	isEmpty?: boolean;
	driver?: boolean;
};

export function SalesDispatchSkeleton({
	initialSettings,
	rowCount,
	isEmpty,
	driver,
}: Props) {
	return (
		<TableSkeleton
			columns={driver ? driverColumns : columns}
			rowCount={rowCount}
			isEmpty={isEmpty}
			columnVisibility={initialSettings?.columns}
			columnSizing={initialSettings?.sizing}
			columnOrder={initialSettings?.order}
			tableConfig={tableConfig}
		/>
	);
}
