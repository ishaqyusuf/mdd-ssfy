"use client";

import { LegacyFormDataTable } from "@/components/forms/sales-form/legacy-form-data-table";
import type { TableSettings } from "@/utils/table-settings";

import {
	type SalesFormMouldingLineRow,
	columns,
	getSalesFormMouldingLineRowId,
} from "./columns";

type Props = {
	data: SalesFormMouldingLineRow[];
	initialSettings?: Partial<TableSettings>;
};

export function DataTable({ data }: Props) {
	return (
		<LegacyFormDataTable
			data={data}
			columns={columns}
			getRowId={getSalesFormMouldingLineRowId}
		/>
	);
}
