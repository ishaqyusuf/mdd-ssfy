"use client";

import { LegacyFormDataTable } from "@/components/forms/sales-form/legacy-form-data-table";
import type { TableSettings } from "@/utils/table-settings";

import {
	type SalesFormHptLineRow,
	columns,
	getSalesFormHptLineRowId,
} from "./columns";

export type { SalesFormHptLineRow } from "./columns";

type Props = {
	data: SalesFormHptLineRow[];
	isSlab: boolean;
	showSwing: boolean;
	noHandle: boolean;
	initialSettings?: Partial<TableSettings>;
};

export function DataTable({ data, isSlab, showSwing, noHandle }: Props) {
	return (
		<LegacyFormDataTable
			data={data}
			columns={columns}
			getRowId={getSalesFormHptLineRowId}
			columnVisibility={{
				production: isSlab,
				swing: showSwing,
				qty: noHandle,
				lh: !noHandle,
				rh: !noHandle,
			}}
		/>
	);
}
