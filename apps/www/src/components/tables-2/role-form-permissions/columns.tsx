"use client";

import type { CreateRoleForm } from "@/actions/create-role-action";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import { DataSkeleton } from "@/components/data-skeleton";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { ColumnDef } from "@tanstack/react-table";
import type { Control } from "react-hook-form";

export type RoleFormPermissionRow = {
	uid: string;
	permission: string;
};

type PermissionAction = "view" | "edit";
type PermissionFieldName = `permissions.${string}.checked`;

export type RoleFormPermissionsTableMeta = {
	control: Control<CreateRoleForm>;
};

type Column = ColumnDef<RoleFormPermissionRow>;

function getMeta(table: unknown): RoleFormPermissionsTableMeta | undefined {
	return (
		table as {
			options?: { meta?: RoleFormPermissionsTableMeta };
		}
	).options?.meta;
}

function permissionFieldName(
	permission: string,
	action: PermissionAction,
): PermissionFieldName {
	return `permissions.${action} ${permission}.checked`;
}

export function getRoleFormPermissionRowId(row: RoleFormPermissionRow) {
	return row.uid;
}

const permissionColumn: Column = {
	id: "permission",
	header: "Permissions",
	accessorKey: "permission",
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
		<DataSkeleton pok="date">
			<span className="block truncate text-xs font-medium uppercase tracking-normal text-muted-foreground">
				{row.original.permission}
			</span>
		</DataSkeleton>
	),
};

function PermissionCheckboxCell({
	row,
	table,
	action,
}: {
	row: { original: RoleFormPermissionRow };
	table: unknown;
	action: PermissionAction;
}) {
	const meta = getMeta(table);

	return (
		<DataSkeleton placeholder="**">
			<div className="flex justify-center">
				<FormCheckbox
					control={meta?.control}
					name={permissionFieldName(row.original.permission, action)}
					className="space-x-0"
				/>
			</div>
		</DataSkeleton>
	);
}

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
		<PermissionCheckboxCell row={row} table={table} action="view" />
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
		<PermissionCheckboxCell row={row} table={table} action="edit" />
	),
};

export const columns: Column[] = [permissionColumn, createColumn, editColumn];
