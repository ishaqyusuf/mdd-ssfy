"use client";

import type { getEmployeeProfilesList } from "@/actions/get-employee-profiles";
import ConfirmBtn from "@/components/confirm-button";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { PageItemData } from "@/types/type";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type EmployeeProfileRow = PageItemData<typeof getEmployeeProfilesList>;

export type EmployeeProfilesTableMeta = {
	onEdit: (profile: EmployeeProfileRow) => void;
	onDelete: (profile: EmployeeProfileRow) => Promise<void> | void;
};

type Column = ColumnDef<EmployeeProfileRow>;

function getMeta(table: unknown): EmployeeProfilesTableMeta | undefined {
	return (
		table as {
			options?: { meta?: EmployeeProfilesTableMeta };
		}
	).options?.meta;
}

function formatPercent(value?: number | null) {
	if (!value) return "-";
	return `${value}%`;
}

export function getEmployeeProfileRowId(row: EmployeeProfileRow) {
	return String(row.id);
}

const profileColumn: Column = {
	id: "profile",
	header: "Profile",
	accessorKey: "name",
	...sizes.custom(190, 340, 230),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Profile",
		className: sizeClass(
			sizes.custom(190, 340, 230),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.name || "Untitled profile"}
			/>
			<p className="truncate text-xs text-muted-foreground">
				Profile #{row.original.id}
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
			{row.original._count?.employees || 0}
		</span>
	),
};

const commissionColumn: Column = {
	id: "commission",
	header: "Commission",
	accessorKey: "salesComissionPercentage",
	...sizes.custom(126, 190, 144),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Commission",
		className: sizeClass(sizes.custom(126, 190, 144), "justify-end"),
		contentClassName: "justify-end",
	},
	cell: ({ row }) => (
		<Badge variant="outline" className="h-5 rounded-full tabular-nums">
			{formatPercent(row.original.salesComissionPercentage)}
		</Badge>
	),
};

const paycutColumn: Column = {
	id: "paycut",
	header: "Paycut",
	accessorKey: "discount",
	...sizes.custom(112, 170, 128),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-16" },
		headerLabel: "Paycut",
		className: sizeClass(sizes.custom(112, 170, 128), "justify-end"),
		contentClassName: "justify-end",
	},
	cell: ({ row }) => (
		<Badge variant="outline" className="h-5 rounded-full tabular-nums">
			{formatPercent(row.original.discount)}
		</Badge>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(92, 122, 104),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(92, 122, 104),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const profile = row.original;
		const hasEmployees = Boolean(profile._count?.employees);

		return (
			<div
				className="relative z-10 flex justify-end gap-1"
				onClick={(event) => event.stopPropagation()}
				onKeyDown={(event) => event.stopPropagation()}
			>
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					aria-label={`Edit ${profile.name}`}
					onClick={() => meta?.onEdit(profile)}
				>
					<Icons.Edit className="size-4" />
				</Button>
				<ConfirmBtn
					type="button"
					variant="ghost"
					size="icon-xs"
					trash
					disabled={hasEmployees}
					title={
						hasEmployees
							? "Profiles assigned to employees cannot be deleted"
							: `Delete ${profile.name}`
					}
					onClick={async () => {
						await meta?.onDelete(profile);
					}}
				/>
			</div>
		);
	},
};

export const columns: Column[] = [
	profileColumn,
	employeesColumn,
	commissionColumn,
	paycutColumn,
	actionsColumn,
];
