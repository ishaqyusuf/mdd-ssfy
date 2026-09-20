"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Switch } from "@gnd/ui/switch";
import type { ColumnDef } from "@tanstack/react-table";

export type AssistantAccessRow =
	RouterOutputs["assistant"]["adminPermissions"][number];
export type AssistantAccessTableMeta = {
	isUpdating: boolean;
	onAccessChange: (row: AssistantAccessRow, enabled: boolean) => void;
};

export const columns: ColumnDef<AssistantAccessRow>[] = [
	{
		id: "employee",
		header: "Employee",
		accessorFn: (row) => row.name || row.email,
		cell: ({ row }) => (
			<div>
				<p className="font-medium">{row.original.name || "Unnamed employee"}</p>
				<p className="text-xs text-muted-foreground">{row.original.email}</p>
			</div>
		),
	},
	{
		id: "source",
		header: "Access source",
		cell: ({ row }) => {
			const user = row.original;
			return (
				<Badge variant={user.enabled ? "default" : "secondary"}>
					{user.accessRevokedAt
						? "Account revoked"
						: user.superAdmin
							? "Super Admin"
							: user.inherited && user.directlyGranted
								? "Role + direct"
								: user.inherited
									? "Role"
									: user.directlyGranted
										? "Direct"
										: "No access"}
				</Badge>
			);
		},
	},
	{
		id: "access",
		header: () => <span className="block text-right">Direct permission</span>,
		cell: ({ row, table }) => {
			const meta = table.options.meta as AssistantAccessTableMeta;
			const user = row.original;
			return (
				<div className="flex justify-end">
					<Switch
						aria-label={`Direct Assistant permission for ${user.name || user.email}`}
						checked={user.directlyGranted}
						disabled={
							Boolean(user.accessRevokedAt) ||
							user.superAdmin ||
							meta.isUpdating
						}
						onCheckedChange={(checked) => meta.onAccessChange(user, checked)}
					/>
				</div>
			);
		},
	},
];
