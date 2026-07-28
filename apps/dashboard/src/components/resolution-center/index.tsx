"use client";

import { DataTable } from "@/components/tables-2/sales-resolution/data-table";
import type { TableSettings } from "@/utils/table-settings";

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function ResolutionCenter({ initialSettings }: Props) {
	return <DataTable initialSettings={initialSettings} />;
}
