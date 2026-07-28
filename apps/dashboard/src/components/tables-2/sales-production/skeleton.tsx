import { TableSkeleton } from "@/components/tables-2/core";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import type { TableSettings } from "@/utils/table-settings";

import { columns, workerColumns } from "./columns";

const tableConfig = TABLE_CONFIGS["sales-production"];

type Props = {
	initialSettings?: Partial<TableSettings>;
	rowCount?: number;
	isEmpty?: boolean;
	workerMode?: boolean;
};

export function SalesProductionSkeleton({
	initialSettings,
	rowCount = 8,
	isEmpty,
	workerMode,
}: Props) {
	return (
		<TableSkeleton
			columns={workerMode ? workerColumns : columns}
			rowCount={rowCount}
			isEmpty={isEmpty}
			columnVisibility={initialSettings?.columns}
			columnSizing={initialSettings?.sizing}
			columnOrder={initialSettings?.order}
			tableConfig={tableConfig}
		/>
	);
}
