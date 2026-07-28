"use client";

import { LegacyFormDataTable } from "@/components/forms/sales-form/legacy-form-data-table";
import type { TableSettings } from "@/utils/table-settings";

import {
	type SalesFormTakeoffHptLineRow,
	columns,
	getSalesFormTakeoffHptLineRowId,
} from "./columns";

export type { SalesFormTakeoffHptLineRow } from "./columns";

type Props = {
	data: SalesFormTakeoffHptLineRow[];
	showSwing: boolean;
	noHandle: boolean;
	initialSettings?: Partial<TableSettings>;
};

export function DataTable({ data, showSwing, noHandle }: Props) {
	return (
		<LegacyFormDataTable
			data={data}
			columns={columns}
			getRowId={getSalesFormTakeoffHptLineRowId}
			columnVisibility={{
				swing: showSwing,
				qty: noHandle,
				lh: !noHandle,
				rh: !noHandle,
			}}
		/>
	);
}
