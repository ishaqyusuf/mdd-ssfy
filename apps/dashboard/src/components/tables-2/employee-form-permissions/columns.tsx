"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { Checkbox } from "@gnd/ui/checkbox";
import type { ColumnDef } from "@tanstack/react-table";

export type EmployeeFormPermissionRow = {
	uid: string;
	key: string;
	viewPermissionId?: number;
	editPermissionId?: number;
};

export type EmployeeFormPermissionsTableMeta = {
	selectedPermissionIds: number[];
	onTogglePermission: (
		permissionId: number | undefined,
		checked: boolean,
	) => void;
};

type Column = ColumnDef<EmployeeFormPermissionRow>;

function getMeta(table: unknown): EmployeeFormPermissionsTableMeta | undefined {
	return (
		table as {
			options?: { meta?: EmployeeFormPermissionsTableMeta };
		}
	).options?.meta;
}

function PermissionCheckboxCell({
	row,
	table,
	permissionId,
}: {
	row: { original: EmployeeFormPermissionRow };
	table: unknown;
	permissionId?: number;
}) {
	const meta = getMeta(table);
	const checked = permissionId
		? (meta?.selectedPermissionIds.includes(permissionId) ?? false)
		: false;

	return (
		<div className="flex justify-center">
			<Checkbox
				checked={checked}
				disabled={!permissionId}
				aria-label={`Toggle ${row.original.key}`}
				onCheckedChange={() => meta?.onTogglePermission(permissionId, checked)}
			/>
		</div>
	);
}

export function getEmployeeFormPermissionRowId(row: EmployeeFormPermissionRow) {
	return row.uid;
}

const permissionColumn: Column = {
	id: "permission",
	header: "Permissions",
	accessorKey: "key",
	...sizes.custom(240, 420, 300),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Permissions",
		className: sizeClass(
			sizes.custom(240, 420, 300),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<span className="block truncate text-xs font-medium uppercase tracking-normal text-muted-foreground">
			{row.original.key}
		</span>
	),
};

const createColumn: Column = {
	id: "create",
	header: "Create",
	...sizes.custom(84, 112, 92),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-10" },
		headerLabel: "Create",
		className: sizeClass(sizes.custom(84, 112, 92), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row, table }) => (
		<PermissionCheckboxCell
			row={row}
			table={table}
			permissionId={row.original.viewPermissionId}
		/>
	),
};

const editColumn: Column = {
	id: "edit",
	header: "Edit",
	...sizes.custom(84, 112, 92),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-10" },
		headerLabel: "Edit",
		className: sizeClass(sizes.custom(84, 112, 92), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row, table }) => (
		<PermissionCheckboxCell
			row={row}
			table={table}
			permissionId={row.original.editPermissionId}
		/>
	),
};

export const columns: Column[] = [permissionColumn, createColumn, editColumn];
