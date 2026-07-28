"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type InventoryKindReviewRow =
	RouterOutputs["inventories"]["inventoryProductKindReview"]["data"][number];

type Column = ColumnDef<InventoryKindReviewRow>;

function formatLabel(value?: string | null) {
	return String(value || "unknown").replaceAll("_", " ");
}

function formatNumber(value?: number | null) {
	return Number(value || 0).toLocaleString("en-US");
}

export function getInventoryKindReviewRowId(row: InventoryKindReviewRow) {
	return String(row.id);
}

const itemColumn: Column = {
	id: "item",
	header: "Item",
	accessorKey: "name",
	...sizes.custom(200, 380, 250),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-56" },
		headerLabel: "Item",
		className: sizeClass(
			sizes.custom(200, 380, 250),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.name || "Untitled inventory item"}
			/>
			<p className="truncate text-xs text-muted-foreground">
				{row.original.uid || `Inventory #${row.original.id}`}
			</p>
		</div>
	),
};

const categoryColumn: Column = {
	id: "category",
	header: "Category",
	accessorKey: "category",
	...sizes.custom(150, 260, 180),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Category",
		className: sizeClass(sizes.custom(150, 260, 180)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate"
			text={row.original.category || "No category"}
		/>
	),
};

const currentColumn: Column = {
	id: "currentKind",
	header: "Current",
	accessorKey: "currentKind",
	...sizes.custom(104, 150, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Current",
		className: sizeClass(sizes.custom(104, 150, 118)),
	},
	cell: ({ row }) => (
		<Badge
			variant="outline"
			className="h-6 max-w-full px-2 text-[11px] capitalize"
		>
			<span className="truncate">{formatLabel(row.original.currentKind)}</span>
		</Badge>
	),
};

const suggestedColumn: Column = {
	id: "suggestedKind",
	header: "Suggested",
	accessorKey: "suggestedKind",
	...sizes.custom(112, 170, 128),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Suggested",
		className: sizeClass(sizes.custom(112, 170, 128)),
	},
	cell: ({ row }) => (
		<Badge
			variant={row.original.needsReview ? "destructive" : "secondary"}
			className="h-6 max-w-full px-2 text-[11px] capitalize"
		>
			<span className="truncate">
				{formatLabel(row.original.suggestedKind)}
			</span>
		</Badge>
	),
};

const evidenceColumn: Column = {
	id: "evidence",
	header: "Evidence",
	accessorKey: "hasMeaningfulPrice",
	...sizes.custom(140, 220, 160),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Evidence",
		className: sizeClass(sizes.custom(140, 220, 160)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<p className="truncate font-medium">
				{row.original.hasMeaningfulPrice ? "Priced item" : "No pricing"}
			</p>
			<p className="truncate text-xs text-muted-foreground">
				{row.original.hasMeaningfulPrice
					? "Should be inventory"
					: "Should be component"}
			</p>
		</div>
	),
};

const countsColumn: Column = {
	id: "counts",
	header: "Counts",
	accessorFn: (row) => row.variantCount + row.pricingCount,
	...sizes.custom(120, 170, 136),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Counts",
		className: sizeClass(sizes.custom(120, 170, 136), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 text-right">
			<p className="truncate font-mono font-medium">
				{formatNumber(row.original.variantCount)} variants
			</p>
			<p className="truncate text-xs text-muted-foreground">
				{formatNumber(row.original.pricingCount)} pricing
			</p>
		</div>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "needsReview",
	...sizes.custom(112, 170, 128),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(112, 170, 128)),
	},
	cell: ({ row }) => (
		<Badge
			variant={row.original.needsReview ? "destructive" : "secondary"}
			className="h-6 max-w-full px-2 text-[11px]"
		>
			<span className="truncate">
				{row.original.needsReview ? "Needs review" : "Aligned"}
			</span>
		</Badge>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(84, 112, 96),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		skeleton: { type: "button", width: "w-20" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(84, 112, 96),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row }) => (
		<div className="relative z-10 flex justify-end gap-1">
			<Button
				asChild
				variant="ghost"
				size="icon"
				className="size-7"
				title="Open item"
			>
				<Link href={`/inventory/${row.original.id}`}>
					<Icons.Eye className="size-3.5" />
				</Link>
			</Button>
			<Button
				asChild
				variant="ghost"
				size="icon"
				className="size-7"
				title="Edit item"
			>
				<Link href={`/inventory?productId=${row.original.id}`}>
					<Icons.Edit className="size-3.5" />
				</Link>
			</Button>
		</div>
	),
};

export const columns: Column[] = [
	itemColumn,
	categoryColumn,
	currentColumn,
	suggestedColumn,
	evidenceColumn,
	countsColumn,
	statusColumn,
	actionsColumn,
];
