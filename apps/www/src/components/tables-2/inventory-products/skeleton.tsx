"use client";

import { TableSkeleton } from "@/components/tables-2/core";
import { STICKY_COLUMNS } from "@/utils/table-configs";
import type { TableSettings } from "@/utils/table-settings";

import { columns } from "./columns";

type Props = {
	initialSettings?: Partial<TableSettings>;
	rowCount?: number;
	isEmpty?: boolean;
};

export function InventoryProductsSkeleton({
	initialSettings,
	rowCount,
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
			stickyColumnIds={STICKY_COLUMNS["inventory-products"].map(({ id }) => id)}
		/>
	);
}
