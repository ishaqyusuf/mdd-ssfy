"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Menu } from "@gnd/ui/custom/menu";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { INVENTORY_STATUS } from "@sales/constants";
import type { ColumnDef } from "@tanstack/react-table";
import { capitalize } from "lodash";

type VariantStockForm = RouterOutputs["inventories"]["inventoryVariantStockForm"];

export type InventoryProductFormVariantRow =
	VariantStockForm["attributeMaps"][number];
export type InventoryProductFormVariantStatus =
	(typeof INVENTORY_STATUS)[number];

export type InventoryProductFormVariantsTableMeta = {
	selectedVariantUid?: string | null;
	onToggleVariant: (row: InventoryProductFormVariantRow) => void;
	onStatusChange: (
		row: InventoryProductFormVariantRow,
		status: InventoryProductFormVariantStatus,
	) => void;
};

type Column = ColumnDef<InventoryProductFormVariantRow>;

function getMeta(
	table: unknown,
): InventoryProductFormVariantsTableMeta | undefined {
	return (
		table as {
			options?: { meta?: InventoryProductFormVariantsTableMeta };
		}
	).options?.meta;
}

function variantTitle(row: InventoryProductFormVariantRow) {
	return row.title || "DEFAULT";
}

function variantDescription(row: InventoryProductFormVariantRow) {
	const attributes = (row.attributes || [])
		.map((attribute) => {
			const label = attribute.attributeLabel || "";
			const value = attribute.valueLabel || "";
			if (!label && !value) return null;
			return `${label}: ${value}`;
		})
		.filter(Boolean);

	return attributes.length ? attributes.join(" / ") : row.uid || "No attributes";
}

export function getInventoryProductFormVariantRowId(
	row: InventoryProductFormVariantRow,
	index?: number,
) {
	return String(row.uid || row.variantId || `variant-${index ?? 0}`);
}

const variantColumn: Column = {
	id: "variant",
	header: "Variant",
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Variant",
		className: sizeClass(
			sizes.custom(220, 420, 280),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const selected = meta?.selectedVariantUid === row.original.uid;

		return (
			<div className="min-w-0">
				<TextWithTooltip
					className={cn(
						"max-w-full truncate font-medium uppercase",
						selected && "text-primary",
					)}
					text={variantTitle(row.original)}
				/>
				<p className="truncate text-xs text-muted-foreground">
					{variantDescription(row.original)}
				</p>
			</div>
		);
	},
};

const costColumn: Column = {
	id: "cost",
	header: "Cost",
	...sizes.custom(104, 144, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Cost",
		className: sizeClass(sizes.custom(104, 144, 118), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) =>
		row.original.price ? (
			<AnimatedNumber value={row.original.price} currency="USD" />
		) : (
			<span className="text-muted-foreground">-</span>
		),
};

const stockColumn: Column = {
	id: "stock",
	header: "Stock",
	...sizes.custom(88, 124, 96),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-12" },
		headerLabel: "Stock",
		className: sizeClass(sizes.custom(88, 124, 96), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) =>
		row.original.stockCount ? (
			<AnimatedNumber value={row.original.stockCount} />
		) : (
			<span className="text-muted-foreground">-</span>
		),
};

const lowStockColumn: Column = {
	id: "lowStock",
	header: "Low",
	...sizes.custom(84, 120, 92),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-12" },
		headerLabel: "Low Stock",
		className: sizeClass(sizes.custom(84, 120, 92), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) =>
		row.original.lowStock ? (
			<AnimatedNumber value={row.original.lowStock} />
		) : (
			<span className="text-muted-foreground">-</span>
		),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	...sizes.custom(118, 170, 132),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(118, 170, 132)),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<Menu
				Trigger={
					<Button type="button" variant="outline" size="sm">
						<Progress>
							<Progress.Status>
								{row.original.status || "draft"}
							</Progress.Status>
						</Progress>
					</Button>
				}
			>
				{INVENTORY_STATUS.map((status) => (
					<Menu.Item
						key={status}
						icon={capitalize(status) as never}
						onClick={() => meta?.onStatusChange(row.original, status)}
					>
						{capitalize(status)}
					</Menu.Item>
				))}
			</Menu>
		);
	},
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(64, 80, 72),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-8" },
		className: sizeClass(
			sizes.custom(64, 80, 72),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const selected = meta?.selectedVariantUid === row.original.uid;

		return (
			<div className="flex justify-end">
				<Button
					type="button"
					variant={selected ? "secondary" : "ghost"}
					size="icon-xs"
					aria-label={`${selected ? "Close" : "Open"} ${variantTitle(
						row.original,
					)} variant pricing`}
					onClick={(event) => {
						event.stopPropagation();
						meta?.onToggleVariant(row.original);
					}}
				>
					{selected ? (
						<Icons.X className="size-3" />
					) : (
						<Icons.ChevronRight className="size-4" />
					)}
				</Button>
			</div>
		);
	},
};

export function getInventoryProductFormVariantColumns(stockMonitor: boolean) {
	return stockMonitor
		? [
				variantColumn,
				costColumn,
				stockColumn,
				lowStockColumn,
				statusColumn,
				actionsColumn,
			]
		: [variantColumn, costColumn, statusColumn, actionsColumn];
}
