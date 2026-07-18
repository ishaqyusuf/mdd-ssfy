"use client";

import type { getRolesList } from "@/actions/get-roles";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { PageItemData } from "@/types/type";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type RoleRow = PageItemData<typeof getRolesList>;

export type RolesTableMeta = {
	onEdit: (role: RoleRow) => void;
};

type Column = ColumnDef<RoleRow>;

function getMeta(table: unknown): RolesTableMeta | undefined {
	return (
		table as {
			options?: { meta?: RolesTableMeta };
		}
	).options?.meta;
}

export function getRoleRowId(row: RoleRow) {
	return String(row.id);
}

const roleColumn: Column = {
	id: "role",
	header: "Role",
	accessorKey: "name",
	...sizes.custom(180, 320, 220),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Role",
		className: sizeClass(
			sizes.custom(180, 320, 220),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.name || "Untitled role"}
			/>
			<p className="truncate text-xs text-muted-foreground">
				Role #{row.original.id}
			</p>
		</div>
	),
};

const employeesColumn: Column = {
	id: "employees",
	header: "Employees",
	...sizes.custom(108, 160, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Employees",
		className: sizeClass(sizes.custom(108, 160, 120), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right tabular-nums">
			{row.original._count?.ModelHasRoles || 0}
		</span>
	),
};

const permissionsColumn: Column = {
	id: "permissions",
	header: "Permissions",
	...sizes.custom(120, 180, 136),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Permissions",
		className: sizeClass(sizes.custom(120, 180, 136), "justify-end"),
		contentClassName: "justify-end",
	},
	cell: ({ row }) => (
		<Badge variant="outline" className="h-5 rounded-full tabular-nums">
			{row.original._count?.RoleHasPermissions || 0}
		</Badge>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(72, 104, 84),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(72, 104, 84),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<div className="relative z-10 flex justify-end">
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					aria-label={`Edit ${row.original.name}`}
					onClick={(event) => {
						event.stopPropagation();
						meta?.onEdit(row.original);
					}}
				>
					<Icons.Edit className="size-4" />
				</Button>
			</div>
		);
	},
};

export const columns: Column[] = [
	roleColumn,
	employeesColumn,
	permissionsColumn,
	actionsColumn,
];
