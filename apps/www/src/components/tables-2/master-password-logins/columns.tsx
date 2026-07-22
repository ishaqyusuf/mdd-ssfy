"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export type MasterPasswordLoginRow =
	RouterOutputs["masterPasswordLoginAudits"]["list"]["rows"][number];

export type MasterPasswordLoginsTableMeta = {
	clearingRowId?: string | null;
	onClearRecord: (row: MasterPasswordLoginRow) => void;
};

type Column = ColumnDef<MasterPasswordLoginRow>;

function getMeta(table: unknown): MasterPasswordLoginsTableMeta | undefined {
	return (
		table as {
			options?: { meta?: MasterPasswordLoginsTableMeta };
		}
	).options?.meta;
}

function toDate(value?: string | Date | null) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value?: string | Date | null) {
	const date = toDate(value);
	if (!date) return "-";
	return format(date, "MMM d, yyyy h:mm a");
}

function userLabel(row: MasterPasswordLoginRow) {
	return (
		row.targetUser?.name || row.targetUserName || row.targetUserEmail || "-"
	);
}

function userEmail(row: MasterPasswordLoginRow) {
	return row.targetUser?.email || row.targetUserEmail || "No email snapshot";
}

function usageLabel(row: MasterPasswordLoginRow) {
	return row.usageType === "SALES_REP_TRANSFER"
		? "Sales rep transfer"
		: "Login";
}

function usageResourceLabel(row: MasterPasswordLoginRow) {
	if (row.usageType !== "SALES_REP_TRANSFER" || !row.resourceId) return null;
	const resourceType = row.resourceType === "quote" ? "Quote" : "Order";
	return `${resourceType} ${row.resourceId}`;
}

function platformLabel(platform: MasterPasswordLoginRow["platform"]) {
	switch (platform) {
		case "WEBSITE":
			return "Website";
		case "MOBILE":
			return "Mobile";
		default:
			return "Unknown";
	}
}

function platformClassName(platform: MasterPasswordLoginRow["platform"]) {
	switch (platform) {
		case "WEBSITE":
			return "border-sky-200 bg-sky-50 text-sky-700";
		case "MOBILE":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		default:
			return "border-muted bg-muted/40 text-muted-foreground";
	}
}

function statusClassName(row: MasterPasswordLoginRow) {
	return row.clearedAt
		? "border-muted bg-muted/40 text-muted-foreground"
		: "border-amber-200 bg-amber-50 text-amber-700";
}

function countryLabel(countryCode?: string | null) {
	if (!countryCode) return "-";

	try {
		const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
		const countryName = displayNames.of(countryCode);

		return countryName ? `${countryName} (${countryCode})` : countryCode;
	} catch {
		return countryCode;
	}
}

export function getMasterPasswordLoginRowId(row: MasterPasswordLoginRow) {
	return row.id;
}

const userColumn: Column = {
	id: "user",
	header: "User",
	accessorFn: userLabel,
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "User",
		className: sizeClass(
			sizes.custom(220, 420, 280),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={userLabel(row.original)}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={userEmail(row.original)}
			/>
		</div>
	),
};

const dateColumn: Column = {
	id: "loginAt",
	header: "Date",
	accessorKey: "loginAt",
	...sizes.custom(150, 230, 170),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Date",
		className: sizeClass(sizes.custom(150, 230, 170)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm"
			text={formatDateTime(row.original.loginAt)}
		/>
	),
};

const usageColumn: Column = {
	id: "usage",
	header: "Usage",
	accessorFn: usageLabel,
	...sizes.custom(180, 300, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Usage",
		className: sizeClass(sizes.custom(180, 300, 220)),
	},
	cell: ({ row }) => {
		const resource = usageResourceLabel(row.original);

		return (
			<div className="min-w-0 space-y-0.5">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={usageLabel(row.original)}
				/>
				{resource ? (
					<TextWithTooltip
						className="max-w-full truncate text-xs text-muted-foreground"
						text={resource}
					/>
				) : null}
			</div>
		);
	},
};

const platformColumn: Column = {
	id: "platform",
	header: "Platform",
	accessorKey: "platform",
	...sizes.custom(110, 170, 130),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Platform",
		className: sizeClass(sizes.custom(110, 170, 130)),
	},
	cell: ({ row }) => (
		<Badge
			variant="outline"
			className={platformClassName(row.original.platform)}
		>
			{platformLabel(row.original.platform)}
		</Badge>
	),
};

const ipColumn: Column = {
	id: "ipAddress",
	header: "IP",
	accessorKey: "ipAddress",
	...sizes.custom(130, 210, 150),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "IP",
		className: sizeClass(sizes.custom(130, 210, 150)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-mono text-xs"
			text={row.original.ipAddress || "-"}
		/>
	),
};

const countryColumn: Column = {
	id: "country",
	header: "Country",
	accessorKey: "countryCode",
	...sizes.custom(140, 240, 170),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Country",
		className: sizeClass(sizes.custom(140, 240, 170)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm"
			text={countryLabel(row.original.countryCode)}
		/>
	),
};

const browserColumn: Column = {
	id: "browser",
	header: "Browser",
	accessorKey: "browser",
	...sizes.custom(210, 420, 280),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Browser",
		className: sizeClass(sizes.custom(210, 420, 280)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate text-sm"
				text={row.original.browser || "Unknown browser"}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.original.userAgent || "-"}
			/>
		</div>
	),
};

const sessionColumn: Column = {
	id: "session",
	header: "Session / Request",
	accessorFn: (row) => row.sessionId || row.requestId,
	...sizes.custom(160, 300, 210),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Session / Request",
		className: sizeClass(sizes.custom(160, 300, 210)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-mono text-xs"
			text={row.original.sessionId || row.original.requestId || "-"}
		/>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorFn: (row) => (row.clearedAt ? "cleared" : "active"),
	...sizes.custom(110, 170, 130),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(110, 170, 130)),
	},
	cell: ({ row }) => (
		<Badge variant="outline" className={statusClassName(row.original)}>
			{row.original.clearedAt ? "Cleared" : "Active"}
		</Badge>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(110, 142, 124),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(110, 142, 124),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const audit = row.original;
		const isClearing = meta?.clearingRowId === audit.id;

		if (audit.clearedAt) {
			return (
				<span className="text-xs text-muted-foreground" aria-label="Cleared">
					Cleared
				</span>
			);
		}

		return (
			<Button
				type="button"
				size="sm"
				variant="outline"
				disabled={isClearing}
				onClick={(event) => {
					event.stopPropagation();
					meta?.onClearRecord(audit);
				}}
			>
				{isClearing ? (
					<Icons.Loader2 className="mr-2 size-4 animate-spin" />
				) : (
					<Icons.Trash2 className="mr-2 size-4" />
				)}
				Clear
			</Button>
		);
	},
};

export const columns: Column[] = [
	userColumn,
	usageColumn,
	dateColumn,
	platformColumn,
	ipColumn,
	countryColumn,
	browserColumn,
	sessionColumn,
	statusColumn,
	actionsColumn,
];
