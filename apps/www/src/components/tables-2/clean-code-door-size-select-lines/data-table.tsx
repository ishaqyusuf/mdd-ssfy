"use client";

import { LegacyFormDataTable } from "@/components/forms/sales-form/legacy-form-data-table";
import type { TableSettings } from "@/utils/table-settings";

import {
	type CleanCodeDoorSizeSelectLineRow,
	columns,
	getCleanCodeDoorSizeSelectLineRowId,
} from "./columns";

export type {
	CleanCodeDoorSizeSelectLineRow,
	CleanCodeDoorSizeSelectVariant,
} from "./columns";
export { buildCleanCodeDoorSizeSelectRows } from "./columns";

type Props = {
	data: CleanCodeDoorSizeSelectLineRow[];
	showSwing: boolean;
	noHandle: boolean;
	initialSettings?: Partial<TableSettings>;
};

export function DataTable({ data, showSwing, noHandle }: Props) {
	return (
		<LegacyFormDataTable
			data={data}
			columns={columns}
			getRowId={getCleanCodeDoorSizeSelectLineRowId}
			columnVisibility={{
				swing: showSwing,
				qty: noHandle,
				lh: !noHandle,
				rh: !noHandle,
			}}
		/>
	);
}
