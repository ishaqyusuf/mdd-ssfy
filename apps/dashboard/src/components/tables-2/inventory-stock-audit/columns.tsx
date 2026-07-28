"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";

export type InventoryStockAuditRow =
	RouterOutputs["inventories"]["stockAuditVerificationReport"]["rows"][number];

type Column = ColumnDef<InventoryStockAuditRow>;

function formatLabel(value?: string | null) {
	return String(value || "unknown").replaceAll("_", " ");
}

function formatExpectedChange(value: InventoryStockAuditRow["expectedChange"]) {
	if (value === "positive") return "Positive qty";
	if (value === "negative") return "Negative qty";
	return "Any qty";
}

function auditStatusVariant(status?: string | null) {
	if (status === "verified") return "default";
	if (status === "partial") return "secondary";
	return "outline";
}

function joinValues(values?: string[] | null) {
	if (!values?.length) return "-";

	return values.join(", ");
}

export function getInventoryStockAuditRowId(row: InventoryStockAuditRow) {
	return row.category;
}

const categoryColumn: Column = {
	id: "category",
	header: "Category",
	accessorKey: "category",
	...sizes.custom(160, 260, 190),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Category",
		className: sizeClass(
			sizes.custom(160, 260, 190),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium capitalize"
				text={formatLabel(row.original.category)}
			/>
			<p className="truncate text-xs text-muted-foreground">
				Reason: {formatLabel(row.original.reason)}
			</p>
		</div>
	),
};

const expectedColumn: Column = {
	id: "expected",
	header: "Expected",
	accessorFn: (row) => row.expectedMovementTypes.join(","),
	...sizes.custom(190, 300, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Expected",
		className: sizeClass(sizes.custom(190, 300, 220)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={joinValues(row.original.expectedMovementTypes)}
			/>
			<TextWithTooltip
				className="block max-w-full truncate text-xs text-muted-foreground"
				text={joinValues(row.original.expectedLogActions)}
			/>
		</div>
	),
};

const movementColumn: Column = {
	id: "movements",
	header: "Movements",
	accessorKey: "movementCount",
	...sizes.custom(104, 150, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Movements",
		className: sizeClass(sizes.custom(104, 150, 118), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<div className="min-w-0 text-right">
			<div className="font-mono font-medium">{row.original.movementCount}</div>
			<div className="truncate text-xs text-muted-foreground">matched rows</div>
		</div>
	),
};

const logColumn: Column = {
	id: "logs",
	header: "Logs",
	accessorKey: "logCount",
	...sizes.custom(92, 132, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Logs",
		className: sizeClass(sizes.custom(92, 132, 104), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<div className="min-w-0 text-right">
			<div className="font-mono font-medium">{row.original.logCount}</div>
			<div className="truncate text-xs text-muted-foreground">matched rows</div>
		</div>
	),
};

const changeColumn: Column = {
	id: "change",
	header: "Change",
	accessorKey: "expectedChange",
	...sizes.custom(104, 150, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Change",
		className: sizeClass(sizes.custom(104, 150, 118)),
	},
	cell: ({ row }) => (
		<Badge variant="outline" className="h-6 max-w-full px-2 text-[11px]">
			<span className="truncate">
				{formatExpectedChange(row.original.expectedChange)}
			</span>
		</Badge>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(104, 150, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(104, 150, 118)),
	},
	cell: ({ row }) => (
		<Badge
			variant={auditStatusVariant(row.original.status)}
			className="h-6 max-w-full px-2 text-[11px] capitalize"
		>
			<span className="truncate">{formatLabel(row.original.status)}</span>
		</Badge>
	),
};

export const columns: Column[] = [
	categoryColumn,
	expectedColumn,
	movementColumn,
	logColumn,
	changeColumn,
	statusColumn,
];
