"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { Switch } from "@gnd/ui/switch";
import type { ColumnDef } from "@tanstack/react-table";

export type BugReportAccessEmployeeRow =
	RouterOutputs["hrm"]["getEmployees"]["data"][number];

export type BugReportAccessEmployeesTableMeta = {
	mutationPending?: boolean;
	updatingUserId?: number | null;
	onToggleAccess: (
		row: BugReportAccessEmployeeRow,
		enabled: boolean,
	) => void | Promise<void>;
};

type Column = ColumnDef<BugReportAccessEmployeeRow>;

function getMeta(
	table: unknown,
): BugReportAccessEmployeesTableMeta | undefined {
	return (
		table as {
			options?: { meta?: BugReportAccessEmployeesTableMeta };
		}
	).options?.meta;
}

function isSuperAdminEmployee(employee: BugReportAccessEmployeeRow) {
	return employee.role?.toLowerCase() === "super admin";
}

function getEmployeeLabel(employee: BugReportAccessEmployeeRow) {
	return employee.name || employee.username || `User ${employee.id}`;
}

function getEmployeeContact(employee: BugReportAccessEmployeeRow) {
	return employee.email || employee.username || `User ${employee.id}`;
}

export function getBugReportAccessEmployeeRowId(
	row: BugReportAccessEmployeeRow,
) {
	return String(row.id);
}

const employeeColumn: Column = {
	id: "employee",
	header: "Employee",
	accessorKey: "name",
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Employee",
		className: sizeClass(
			sizes.custom(220, 420, 280),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 items-center gap-2">
			<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
				{getEmployeeLabel(row.original).slice(0, 1).toUpperCase()}
			</div>
			<div className="min-w-0">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={getEmployeeLabel(row.original)}
				/>
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={getEmployeeContact(row.original)}
				/>
			</div>
		</div>
	),
};

const roleColumn: Column = {
	id: "role",
	header: "Role",
	accessorKey: "role",
	...sizes.custom(132, 220, 160),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Role",
		className: sizeClass(sizes.custom(132, 220, 160)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm text-muted-foreground"
			text={row.original.role || "No role"}
		/>
	),
};

const accountColumn: Column = {
	id: "account",
	header: "Account",
	accessorFn: (row) => getEmployeeContact(row),
	...sizes.custom(170, 320, 210),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Account",
		className: sizeClass(sizes.custom(170, 320, 210)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm"
			text={getEmployeeContact(row.original)}
		/>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorFn: (row) => (row.bugReportingEnabled ? "Enabled" : "Disabled"),
	...sizes.custom(112, 170, 126),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(112, 170, 126)),
	},
	cell: ({ row }) => {
		const enabledByRole = isSuperAdminEmployee(row.original);

		return (
			<div className="flex min-w-0 items-center gap-1.5">
				<Badge
					variant={row.original.bugReportingEnabled ? "secondary" : "outline"}
					className="h-5 max-w-full rounded-full text-[10px]"
				>
					<span className="truncate">
						{row.original.bugReportingEnabled ? "Enabled" : "Disabled"}
					</span>
				</Badge>
				{enabledByRole ? (
					<Badge variant="outline" className="h-5 rounded-full text-[10px]">
						By role
					</Badge>
				) : null}
			</div>
		);
	},
};

const accessColumn: Column = {
	id: "access",
	header: "Access",
	...sizes.custom(96, 130, 104),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "icon" },
		headerLabel: "Access",
		className: sizeClass(
			sizes.custom(96, 130, 104),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const enabledByRole = isSuperAdminEmployee(row.original);
		const pending = meta?.updatingUserId === row.original.id;
		const disabled = enabledByRole || pending || meta?.mutationPending;

		return (
			<div className="flex items-center justify-end gap-2">
				{pending ? (
					<Icons.Loader2 className="size-4 animate-spin text-muted-foreground" />
				) : null}
				<Switch
					checked={row.original.bugReportingEnabled}
					disabled={disabled}
					aria-label={`Toggle bug report access for ${getEmployeeLabel(
						row.original,
					)}`}
					onCheckedChange={(enabled) => {
						void meta?.onToggleAccess(row.original, enabled);
					}}
				/>
			</div>
		);
	},
};

export const columns: Column[] = [
	employeeColumn,
	roleColumn,
	accountColumn,
	statusColumn,
	accessColumn,
];
