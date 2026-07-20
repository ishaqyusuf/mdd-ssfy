"use client";

import { LegacyFormDataTable } from "@/components/forms/sales-form/legacy-form-data-table";
import type { TableSettings } from "@/utils/table-settings";

import {
	type SalesFormServiceLineRow,
	type SalesFormServiceLinesTableMeta,
	columns,
	getSalesFormServiceLineRowId,
} from "./columns";

type Props = {
	data: SalesFormServiceLineRow[];
	groupClass: unknown;
	valueChanged: () => void;
	initialSettings?: Partial<TableSettings>;
};

export function DataTable({ data, groupClass, valueChanged }: Props) {
	return (
		<LegacyFormDataTable
			data={data}
			columns={columns}
			getRowId={getSalesFormServiceLineRowId}
			meta={
				{
					groupClass,
					valueChanged,
				} satisfies SalesFormServiceLinesTableMeta
			}
		/>
	);
}
