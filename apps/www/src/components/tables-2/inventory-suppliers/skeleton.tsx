import { TableSkeleton } from "@/components/tables-2/core";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import type { TableSettings } from "@/utils/table-settings";

import { columns } from "./columns";

const tableConfig = TABLE_CONFIGS["inventory-suppliers"];

type Props = {
	initialSettings?: Partial<TableSettings>;
	rowCount?: number;
	isEmpty?: boolean;
};

export function InventorySuppliersSkeleton({
	initialSettings,
	rowCount = 6,
	isEmpty,
}: Props) {
	return (
		<TableSkeleton
			columns={columns}
			rowCount={rowCount}
			isEmpty={isEmpty}
			columnVisibility={initialSettings?.columns}
			columnSizing={initialSettings?.sizing}
			columnOrder={initialSettings?.order}
			tableConfig={tableConfig}
		/>
	);
}
