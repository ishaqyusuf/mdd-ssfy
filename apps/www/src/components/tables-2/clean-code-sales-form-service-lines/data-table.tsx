"use client";

import { LegacyFormDataTable } from "@/components/forms/sales-form/legacy-form-data-table";
import type { TableSettings } from "@/utils/table-settings";

import {
	type CleanCodeSalesFormServiceLineRow,
	columns,
	getCleanCodeSalesFormServiceLineRowId,
} from "./columns";

export type { CleanCodeSalesFormServiceLineRow } from "./columns";

type Props = {
	data: CleanCodeSalesFormServiceLineRow[];
	initialSettings?: Partial<TableSettings>;
};

export function DataTable({ data }: Props) {
	return (
		<LegacyFormDataTable
			data={data}
			columns={columns}
			getRowId={getCleanCodeSalesFormServiceLineRowId}
		/>
	);
}
