"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Switch } from "@gnd/ui/switch";
import type { ColumnDef } from "@tanstack/react-table";

export type AssistantAccessRow =
	RouterOutputs["assistant"]["adminEntitlements"][number];

export type AssistantAccessTableMeta = {
	isUpdating: boolean;
	onAccessChange: (row: AssistantAccessRow, enabled: boolean) => void;
};

function isActive(row: AssistantAccessRow) {
	return Boolean(row.assistantEntitlement?.enabled && !row.accessRevokedAt);
}

function formatDate(value: Date | string) {
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "UTC",
	}).format(new Date(value));
}

function getInitials(value: string) {
	return value
		.split(" ")
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

export const columns: ColumnDef<AssistantAccessRow>[] = [
	{
		id: "employee",
		header: "Employee",
		accessorFn: (row) => row.name || row.email,
		cell: ({ row }) => {
			const employee = row.original;
			const name = employee.name || "Unnamed employee";
			return (
				<div className="flex min-w-0 items-center gap-3">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
						{getInitials(name)}
					</div>
					<div className="min-w-0">
						<p className="truncate font-medium">{name}</p>
						<p className="truncate text-xs text-muted-foreground">
							{employee.email}
						</p>
					</div>
				</div>
			);
		},
	},
	{
		id: "status",
		header: "Status",
		accessorFn: (row) => (isActive(row) ? "enabled" : "disabled"),
		cell: ({ row }) => (
			<Badge
				variant={
					row.original.accessRevokedAt
						? "destructive"
						: isActive(row.original)
							? "default"
							: "secondary"
				}
			>
				{row.original.accessRevokedAt
					? "Account revoked"
					: isActive(row.original)
						? "Enabled"
						: "Disabled"}
			</Badge>
		),
	},
	{
		id: "expiresAt",
		header: "Expires",
		accessorFn: (row) => row.assistantEntitlement?.expiresAt,
		cell: ({ row }) => (
			<span className="text-muted-foreground">
				{row.original.assistantEntitlement?.expiresAt
					? formatDate(row.original.assistantEntitlement.expiresAt)
					: "No expiry"}
			</span>
		),
	},
	{
		id: "lastChange",
		header: "Last change",
		accessorFn: (row) => row.assistantEntitlement?.updatedAt,
		cell: ({ row }) => (
			<div className="max-w-72">
				<p className="truncate text-muted-foreground">
					{row.original.assistantEntitlement?.reason ||
						"No access decision yet"}
				</p>
				<p className="text-xs text-muted-foreground">
					{row.original.assistantEntitlement
						? formatDate(row.original.assistantEntitlement.updatedAt)
						: "—"}
				</p>
			</div>
		),
	},
	{
		id: "access",
		header: () => <span className="block text-right">Access</span>,
		enableSorting: false,
		cell: ({ row, table }) => {
			const meta = table.options.meta as AssistantAccessTableMeta;
			return (
				<div className="flex justify-end">
					<Switch
						aria-label={`Assistant access for ${row.original.name || row.original.email}`}
						checked={isActive(row.original)}
						disabled={Boolean(row.original.accessRevokedAt) || meta.isUpdating}
						onCheckedChange={(checked) =>
							meta.onAccessChange(row.original, checked)
						}
					/>
				</div>
			);
		},
	},
];

export { isActive };
