"use client";

import { LegacyFormDataTable } from "@/components/forms/sales-form/legacy-form-data-table";
import type { TableSettings } from "@/utils/table-settings";

import {
	type SalesFormShelfItemRow,
	columns,
	getSalesFormShelfItemRowId,
} from "./columns";

export type { SalesFormShelfItemRow } from "./columns";

type Props = {
	data: SalesFormShelfItemRow[];
	initialSettings?: Partial<TableSettings>;
};

export function DataTable({ data }: Props) {
	return (
		<LegacyFormDataTable
			data={data}
			columns={columns}
			getRowId={getSalesFormShelfItemRowId}
		/>
	);
}
