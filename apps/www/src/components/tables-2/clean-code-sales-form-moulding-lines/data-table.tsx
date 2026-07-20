"use client";

import { LegacyFormDataTable } from "@/components/forms/sales-form/legacy-form-data-table";
import type { TableSettings } from "@/utils/table-settings";

import {
	type CleanCodeSalesFormMouldingLineRow,
	type CleanCodeSalesFormMouldingLinesTableMeta,
	columns,
	getCleanCodeSalesFormMouldingLineRowId,
} from "./columns";

export type { CleanCodeSalesFormMouldingLineRow } from "./columns";

type Props = {
	data: CleanCodeSalesFormMouldingLineRow[];
	itemType?: string;
	initialSettings?: Partial<TableSettings>;
};

export function DataTable({ data, itemType }: Props) {
	return (
		<LegacyFormDataTable
			data={data}
			columns={columns}
			getRowId={getCleanCodeSalesFormMouldingLineRowId}
			meta={
				{
					itemType,
				} satisfies CleanCodeSalesFormMouldingLinesTableMeta
			}
		/>
	);
}
