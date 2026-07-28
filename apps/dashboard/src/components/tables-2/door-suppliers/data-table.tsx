"use client";

import { LegacyFormDataTable } from "@/components/forms/sales-form/legacy-form-data-table";
import type { TableSettings } from "@/utils/table-settings";

import {
	type DoorSupplierRow,
	type DoorSuppliersTableMeta,
	columns,
	getDoorSupplierRowId,
} from "./columns";
import { EmptyState } from "./empty-states";
import { DoorSuppliersSkeleton } from "./skeleton";

type Props = {
	data: DoorSupplierRow[];
	initialSettings?: Partial<TableSettings>;
	isLoading?: boolean;
	selectedSupplierUid?: string | null;
	isDeleting?: boolean;
	onSelect: (supplier: DoorSupplierRow) => void;
	onEdit: (supplier: DoorSupplierRow) => void;
	onDelete: (supplier: DoorSupplierRow) => void;
};

export function DataTable({
	data,
	isLoading,
	selectedSupplierUid,
	isDeleting,
	onSelect,
	onEdit,
	onDelete,
}: Props) {
	if (isLoading) return <DoorSuppliersSkeleton />;
	if (!data.length) return <EmptyState />;

	return (
		<LegacyFormDataTable
			data={data}
			columns={columns}
			getRowId={getDoorSupplierRowId}
			onRowClick={onSelect}
			meta={
				{
					selectedSupplierUid,
					isDeleting,
					onSelect,
					onEdit,
					onDelete,
				} satisfies DoorSuppliersTableMeta
			}
		/>
	);
}
