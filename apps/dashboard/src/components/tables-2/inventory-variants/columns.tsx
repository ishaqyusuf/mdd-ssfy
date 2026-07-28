"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type InventoryVariantRow =
	RouterOutputs["inventories"]["inventoryVariantsWorkspace"]["data"][number];

type Column = ColumnDef<InventoryVariantRow>;

const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});

function formatMoney(value?: number | null) {
	return currency.format(Number(value || 0));
}

function formatQty(value?: number | null) {
	return Number(value || 0).toLocaleString("en-US", {
		maximumFractionDigits: 2,
	});
}

function statusLabel(value?: string | null) {
	return String(value || "unknown").replaceAll("_", " ");
}

function variantTitle(row: InventoryVariantRow) {
	return row.sku || row.description || row.uid || `Variant ${row.id}`;
}

export function getInventoryVariantRowId(row: InventoryVariantRow) {
	return String(row.id);
}

const variantColumn: Column = {
	id: "variant",
	header: "Variant",
	accessorFn: (row) => variantTitle(row),
	...sizes.custom(260, 500, 320),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-56" },
		headerLabel: "Variant",
		className: sizeClass(
			sizes.custom(260, 500, 320),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={variantTitle(row.original)}
			/>
			<div className="flex min-w-0 flex-wrap items-center gap-1.5">
				<TextWithTooltip
					className="max-w-[150px] truncate text-xs text-muted-foreground"
					text={row.original.inventory?.name || "Unknown item"}
				/>
				{row.original.category?.title ? (
					<Badge variant="secondary" className="max-w-[120px] truncate">
						{row.original.category.title}
					</Badge>
				) : null}
				{row.original.isLowStock ? (
					<Badge variant="destructive" className="whitespace-nowrap">
						Low stock
					</Badge>
				) : null}
			</div>
		</div>
	),
};

const stockColumn: Column = {
	id: "stock",
	header: "Stock",
	accessorKey: "stockQty",
	...sizes.custom(110, 170, 130),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Stock",
		className: sizeClass(sizes.custom(110, 170, 130), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 text-right">
			<p className="truncate font-mono font-medium">
				{formatQty(row.original.stockQty)}
			</p>
			<p className="truncate text-xs text-muted-foreground">
				Alert {formatQty(row.original.lowStockAlert)}
			</p>
		</div>
	),
};

const pricingColumn: Column = {
	id: "pricing",
	header: "Pricing",
	accessorKey: "price",
	...sizes.custom(140, 220, 160),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Pricing",
		className: sizeClass(sizes.custom(140, 220, 160), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 text-right">
			<p className="truncate font-mono font-medium">
				{formatMoney(row.original.price)}
			</p>
			<p className="truncate text-xs text-muted-foreground">
				Cost {formatMoney(row.original.costPrice)}
			</p>
		</div>
	),
};

const supplierColumn: Column = {
	id: "supplier",
	header: "Supplier",
	accessorFn: (row) => row.preferredSupplier?.supplier?.name,
	...sizes.custom(180, 320, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Supplier",
		className: sizeClass(sizes.custom(180, 320, 220)),
	},
	cell: ({ row }) => {
		const supplier =
			row.original.preferredSupplier?.supplier?.name ||
			row.original.inventory?.defaultSupplier?.name ||
			"N/A";
		const supplierSku = row.original.preferredSupplier?.supplierSku;

		return (
			<div className="min-w-0 space-y-0.5">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={supplier}
				/>
				<p className="truncate text-xs text-muted-foreground">
					{row.original.supplierCount} suppliers
					{supplierSku ? ` • ${supplierSku}` : ""}
				</p>
			</div>
		);
	},
};

const attributesColumn: Column = {
	id: "attributes",
	header: "Attributes",
	accessorFn: (row) => row.attributes.length,
	...sizes.custom(200, 420, 260),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-40" },
		headerLabel: "Attributes",
		className: sizeClass(sizes.custom(200, 420, 260)),
	},
	cell: ({ row }) => {
		const visibleAttributes = row.original.attributes.slice(0, 2);
		const extraCount =
			row.original.attributes.length - visibleAttributes.length;

		if (!row.original.attributes.length) {
			return <span className="text-muted-foreground">No attributes</span>;
		}

		return (
			<div className="flex min-w-0 flex-wrap gap-1.5">
				{visibleAttributes.map((attribute) => (
					<Badge
						key={attribute.id}
						variant="outline"
						className="max-w-[150px] truncate"
					>
						{attribute.inventoryCategoryVariantAttribute
							?.valuesInventoryCategory?.title || "Attribute"}
						: {attribute.value?.name || "N/A"}
					</Badge>
				))}
				{extraCount > 0 ? (
					<Badge variant="secondary">+{extraCount}</Badge>
				) : null}
			</div>
		);
	},
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(130, 200, 150),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-28" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(130, 200, 150)),
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 flex-col items-start gap-1">
			<Badge variant="outline" className="max-w-full capitalize">
				<span className="truncate">{statusLabel(row.original.status)}</span>
			</Badge>
			<Badge variant="secondary" className="max-w-full capitalize">
				<span className="truncate">{statusLabel(row.original.stockMode)}</span>
			</Badge>
		</div>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(128, 160, 136),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		skeleton: { type: "button", width: "w-24" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(128, 160, 136),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row }) => <InventoryVariantActions item={row.original} />,
};

function InventoryVariantActions({ item }: { item: InventoryVariantRow }) {
	const inventoryId = item.inventory?.id;

	return (
		<div className="relative z-10 flex justify-end gap-1">
			<Button
				asChild
				variant="ghost"
				size="icon"
				className="size-8"
				disabled={!inventoryId}
				title="Open dashboard"
			>
				<Link href={inventoryId ? `/inventory/${inventoryId}` : "/inventory"}>
					<Icons.Eye className="size-4" />
				</Link>
			</Button>
			<Button
				asChild
				variant="ghost"
				size="icon"
				className="size-8"
				disabled={!inventoryId}
				title="Edit item"
			>
				<Link
					href={
						inventoryId ? `/inventory?productId=${inventoryId}` : "/inventory"
					}
				>
					<Icons.Edit className="size-4" />
				</Link>
			</Button>
			<Button
				asChild
				variant="ghost"
				size="icon"
				className="size-8"
				title="Stock"
			>
				<Link href="/inventory/stocks">
					<Icons.PackageOpen className="size-4" />
				</Link>
			</Button>
		</div>
	);
}

export const columns: Column[] = [
	variantColumn,
	stockColumn,
	pricingColumn,
	supplierColumn,
	attributesColumn,
	statusColumn,
	actionsColumn,
];
