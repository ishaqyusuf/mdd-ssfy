"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

type Dashboard = NonNullable<
	RouterOutputs["inventories"]["inventoryItemDashboard"]
>;

export type InventoryItemVariantRow = Dashboard["variants"][number];
export type InventoryItemStockRow = Dashboard["stocks"][number];
export type InventoryItemMovementRow = Dashboard["movements"][number];
export type InventoryItemInboundDemandRow = Dashboard["inboundDemands"][number];
export type InventoryItemAllocationRow = Dashboard["allocations"][number];
export type InventoryItemRelatedLineRow = Dashboard["relatedSales"][number] & {
	kind: "sales" | "quotes";
};

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

function formatDate(value?: string | Date | null) {
	if (!value) return "N/A";

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

function statusLabel(value?: string | null) {
	return String(value || "unknown").replaceAll("_", " ");
}

function variantLabel(variant?: {
	sku?: string | null;
	description?: string | null;
	uid?: string | null;
}) {
	return variant?.sku || variant?.description || variant?.uid || "Variant";
}

function statusClassName(value?: string | null) {
	const normalized = String(value || "").toLowerCase();

	if (normalized.includes("low") || normalized.includes("blocked")) {
		return "border-red-200 bg-red-50 text-red-700";
	}

	if (normalized.includes("received") || normalized.includes("active")) {
		return "border-emerald-200 bg-emerald-50 text-emerald-700";
	}

	if (normalized.includes("pending") || normalized.includes("partial")) {
		return "border-amber-200 bg-amber-50 text-amber-700";
	}

	return "border-slate-200 bg-slate-50 text-slate-700";
}

function actionButton(href: string, label = "Open") {
	return (
		<Button asChild size="icon-xs" variant="ghost" aria-label={label}>
			<Link href={href} onClick={(event) => event.stopPropagation()}>
				<Icons.ExternalLink className="size-4" />
			</Link>
		</Button>
	);
}

export function getVariantRowId(row: InventoryItemVariantRow, index?: number) {
	return String(row.id ?? row.uid ?? `variant-${index ?? 0}`);
}

export function getStockRowId(row: InventoryItemStockRow, index?: number) {
	return String(row.id ?? `stock-${row.variantSku ?? index ?? 0}`);
}

export function getMovementRowId(
	row: InventoryItemMovementRow,
	index?: number,
) {
	return String(row.id ?? `movement-${index ?? 0}`);
}

export function getInboundDemandRowId(
	row: InventoryItemInboundDemandRow,
	index?: number,
) {
	return String(row.id ?? `inbound-${index ?? 0}`);
}

export function getAllocationRowId(
	row: InventoryItemAllocationRow,
	index?: number,
) {
	return String(row.id ?? `allocation-${index ?? 0}`);
}

export function getRelatedLineRowId(
	row: InventoryItemRelatedLineRow,
	index?: number,
) {
	return String(row.id ?? `${row.kind}-${row.uid ?? index ?? 0}`);
}

export const variantColumns: ColumnDef<InventoryItemVariantRow>[] = [
	{
		id: "variant",
		header: "Variant",
		accessorFn: (row) => variantLabel(row),
		...sizes.custom(220, 420, 280),
		enableResizing: true,
		enableHiding: false,
		meta: {
			sticky: true,
			headerLabel: "Variant",
			skeleton: { type: "text", width: "w-44" },
			className: sizeClass(
				sizes.custom(220, 420, 280),
				"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
		},
		cell: ({ row }) => (
			<div className="min-w-0">
				<TextWithTooltip
					className="max-w-full truncate font-medium uppercase"
					text={variantLabel(row.original)}
				/>
				<p className="truncate font-mono text-xs text-muted-foreground">
					{row.original.uid || "No UID"}
				</p>
			</div>
		),
	},
	{
		id: "status",
		header: "Status",
		accessorKey: "status",
		...sizes.custom(104, 150, 118),
		enableResizing: true,
		meta: {
			headerLabel: "Status",
			skeleton: { type: "badge", width: "w-20" },
			className: sizeClass(sizes.custom(104, 150, 118)),
		},
		cell: ({ row }) => (
			<div className="flex flex-wrap gap-1.5">
				<Badge
					variant="outline"
					className={cn("capitalize", statusClassName(row.original.status))}
				>
					{statusLabel(row.original.status)}
				</Badge>
				{row.original.isLowStock ? (
					<Badge variant="destructive">Low</Badge>
				) : null}
			</div>
		),
	},
	{
		id: "stock",
		header: "Stock",
		accessorKey: "stockQty",
		...sizes.custom(96, 140, 110),
		enableResizing: true,
		meta: {
			headerLabel: "Stock",
			skeleton: { type: "text", width: "w-16" },
			className: sizeClass(sizes.custom(96, 140, 110), "text-right"),
			contentClassName: "justify-end",
		},
		cell: ({ row }) => (
			<div className="text-right">
				<div className="font-medium">{formatQty(row.original.stockQty)}</div>
				<div className="text-xs text-muted-foreground">on hand</div>
			</div>
		),
	},
	{
		id: "pricing",
		header: "Pricing",
		...sizes.custom(160, 240, 180),
		enableResizing: true,
		meta: {
			headerLabel: "Pricing",
			skeleton: { type: "text", width: "w-28" },
			className: sizeClass(sizes.custom(160, 240, 180)),
		},
		cell: ({ row }) => (
			<div className="grid grid-cols-2 gap-2 text-xs">
				<div>
					<div className="text-muted-foreground">Cost</div>
					<div className="font-medium">
						{formatMoney(row.original.pricing?.costPrice)}
					</div>
				</div>
				<div>
					<div className="text-muted-foreground">Price</div>
					<div className="font-medium">
						{formatMoney(row.original.pricing?.price)}
					</div>
				</div>
			</div>
		),
	},
	{
		id: "attributes",
		header: "Attributes",
		...sizes.custom(180, 320, 220),
		enableResizing: true,
		meta: {
			headerLabel: "Attributes",
			skeleton: { type: "text", width: "w-36" },
			className: sizeClass(sizes.custom(180, 320, 220)),
		},
		cell: ({ row }) => {
			const attributes = row.original.attributes
				.map((attribute) => {
					const label =
						attribute.inventoryCategoryVariantAttribute?.valuesInventoryCategory
							?.title || "Attribute";
					return `${label}: ${attribute.value?.name || "N/A"}`;
				})
				.slice(0, 3);

			return (
				<TextWithTooltip
					className="max-w-full truncate text-sm text-muted-foreground"
					text={attributes.length ? attributes.join(" / ") : "No attributes"}
				/>
			);
		},
	},
	{
		id: "supplier",
		header: "Supplier",
		...sizes.custom(170, 280, 210),
		enableResizing: true,
		meta: {
			headerLabel: "Supplier",
			skeleton: { type: "text", width: "w-32" },
			className: sizeClass(sizes.custom(170, 280, 210)),
		},
		cell: ({ row }) => {
			const preferred =
				row.original.supplierVariants.find((supplier) => supplier.preferred) ??
				row.original.supplierVariants[0];

			if (!preferred) {
				return (
					<span className="text-sm text-muted-foreground">No supplier</span>
				);
			}

			return (
				<div className="min-w-0">
					<TextWithTooltip
						className="max-w-full truncate text-sm"
						text={preferred.supplier.name}
					/>
					<div className="text-xs text-muted-foreground">
						{formatMoney(preferred.costPrice)}
						{preferred.preferred ? " / preferred" : ""}
					</div>
				</div>
			);
		},
	},
	{
		id: "actions",
		header: "",
		...sizes.custom(72, 96, 80),
		enableResizing: false,
		enableHiding: false,
		meta: {
			headerLabel: "Actions",
			skeleton: { type: "icon" },
			className: sizeClass(
				sizes.custom(72, 96, 80),
				"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
			contentClassName: "flex justify-end",
		},
		cell: ({ row }) =>
			actionButton("/inventory/variants", `Open ${variantLabel(row.original)}`),
	},
];

export const stockColumns: ColumnDef<InventoryItemStockRow>[] = [
	{
		id: "variant",
		header: "Variant",
		...sizes.custom(200, 340, 240),
		enableResizing: true,
		enableHiding: false,
		meta: {
			sticky: true,
			headerLabel: "Variant",
			skeleton: { type: "text", width: "w-40" },
			className: sizeClass(
				sizes.custom(200, 340, 240),
				"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
		},
		cell: ({ row }) => (
			<div className="min-w-0">
				<TextWithTooltip
					className="max-w-full truncate font-medium uppercase"
					text={
						row.original.variantSku ||
						row.original.variantDescription ||
						"Variant"
					}
				/>
				<p className="truncate text-xs text-muted-foreground">
					{row.original.location || "No location"}
				</p>
			</div>
		),
	},
	{
		id: "supplier",
		header: "Supplier",
		...sizes.custom(170, 280, 210),
		enableResizing: true,
		meta: {
			headerLabel: "Supplier",
			skeleton: { type: "text", width: "w-32" },
			className: sizeClass(sizes.custom(170, 280, 210)),
		},
		cell: ({ row }) => (
			<TextWithTooltip
				className="max-w-full truncate text-sm text-muted-foreground"
				text={row.original.supplier?.name || "No supplier"}
			/>
		),
	},
	{
		id: "qty",
		header: "Qty",
		accessorKey: "qty",
		...sizes.custom(96, 130, 110),
		enableResizing: true,
		meta: {
			headerLabel: "Qty",
			skeleton: { type: "text", width: "w-16" },
			className: sizeClass(sizes.custom(96, 130, 110), "text-right"),
			contentClassName: "justify-end",
		},
		cell: ({ row }) => <span>{formatQty(row.original.qty)}</span>,
	},
	{
		id: "price",
		header: "Value",
		accessorKey: "price",
		...sizes.custom(96, 130, 110),
		enableResizing: true,
		meta: {
			headerLabel: "Value",
			skeleton: { type: "text", width: "w-16" },
			className: sizeClass(sizes.custom(96, 130, 110), "text-right"),
			contentClassName: "justify-end",
		},
		cell: ({ row }) => <span>{formatMoney(row.original.price)}</span>,
	},
	{
		id: "actions",
		header: "",
		...sizes.custom(72, 96, 80),
		enableResizing: false,
		enableHiding: false,
		meta: {
			headerLabel: "Actions",
			skeleton: { type: "icon" },
			className: sizeClass(
				sizes.custom(72, 96, 80),
				"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
			contentClassName: "flex justify-end",
		},
		cell: () => actionButton("/inventory/stocks", "Open stock operations"),
	},
];

export const movementColumns: ColumnDef<InventoryItemMovementRow>[] = [
	{
		id: "event",
		header: "Event",
		accessorKey: "type",
		...sizes.custom(150, 220, 170),
		enableResizing: true,
		enableHiding: false,
		meta: {
			sticky: true,
			headerLabel: "Event",
			skeleton: { type: "text", width: "w-28" },
			className: sizeClass(
				sizes.custom(150, 220, 170),
				"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
		},
		cell: ({ row }) => (
			<div>
				<div className="font-medium capitalize">
					{statusLabel(row.original.type)}
				</div>
				<div className="text-xs text-muted-foreground">
					{formatDate(row.original.createdAt)}
				</div>
			</div>
		),
	},
	{
		id: "variant",
		header: "Variant",
		...sizes.custom(150, 240, 180),
		enableResizing: true,
		meta: {
			headerLabel: "Variant",
			skeleton: { type: "text", width: "w-28" },
			className: sizeClass(sizes.custom(150, 240, 180)),
		},
		cell: ({ row }) => (
			<TextWithTooltip
				className="max-w-full truncate text-sm"
				text={variantLabel({ sku: row.original.variantSku })}
			/>
		),
	},
	{
		id: "quantity",
		header: "Quantity",
		...sizes.custom(150, 220, 170),
		enableResizing: true,
		meta: {
			headerLabel: "Quantity",
			skeleton: { type: "text", width: "w-28" },
			className: sizeClass(sizes.custom(150, 220, 170)),
		},
		cell: ({ row }) => (
			<span className="font-mono text-sm">
				{formatQty(row.original.prevQty)}
				{" -> "}
				{formatQty(row.original.currentQty)}
			</span>
		),
	},
	{
		id: "reference",
		header: "Reference",
		...sizes.custom(220, 380, 260),
		enableResizing: true,
		meta: {
			headerLabel: "Reference",
			skeleton: { type: "text", width: "w-44" },
			className: sizeClass(sizes.custom(220, 380, 260)),
		},
		cell: ({ row }) => (
			<TextWithTooltip
				className="max-w-full truncate text-sm text-muted-foreground"
				text={
					row.original.reference ||
					row.original.notes ||
					row.original.authorName ||
					"N/A"
				}
			/>
		),
	},
];

export const inboundDemandColumns: ColumnDef<InventoryItemInboundDemandRow>[] =
	[
		{
			id: "variant",
			header: "Variant",
			...sizes.custom(160, 260, 190),
			enableResizing: true,
			enableHiding: false,
			meta: {
				sticky: true,
				headerLabel: "Variant",
				skeleton: { type: "text", width: "w-32" },
				className: sizeClass(
					sizes.custom(160, 260, 190),
					"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
				),
			},
			cell: ({ row }) => (
				<div className="min-w-0">
					<TextWithTooltip
						className="max-w-full truncate font-medium uppercase"
						text={row.original.variantSku || "Variant"}
					/>
					<p className="truncate text-xs text-muted-foreground">
						{row.original.lineItemComponent.parent.sale?.orderId || "No sale"}
					</p>
				</div>
			),
		},
		{
			id: "quantity",
			header: "Qty",
			...sizes.custom(110, 150, 120),
			enableResizing: true,
			meta: {
				headerLabel: "Qty",
				skeleton: { type: "text", width: "w-20" },
				className: sizeClass(sizes.custom(110, 150, 120), "text-right"),
				contentClassName: "justify-end",
			},
			cell: ({ row }) => (
				<span>
					{formatQty(row.original.qtyReceived)} / {formatQty(row.original.qty)}
				</span>
			),
		},
		{
			id: "status",
			header: "Status",
			accessorKey: "status",
			...sizes.custom(120, 170, 132),
			enableResizing: true,
			meta: {
				headerLabel: "Status",
				skeleton: { type: "badge", width: "w-24" },
				className: sizeClass(sizes.custom(120, 170, 132)),
			},
			cell: ({ row }) => (
				<Badge
					variant="outline"
					className={cn("capitalize", statusClassName(row.original.status))}
				>
					{statusLabel(row.original.status)}
				</Badge>
			),
		},
		{
			id: "assignment",
			header: "Assignment",
			...sizes.custom(180, 300, 220),
			enableResizing: true,
			meta: {
				headerLabel: "Assignment",
				skeleton: { type: "text", width: "w-36" },
				className: sizeClass(sizes.custom(180, 300, 220)),
			},
			cell: ({ row }) => (
				<TextWithTooltip
					className="max-w-full truncate text-sm text-muted-foreground"
					text={
						row.original.inboundShipmentItem?.inbound.reference ||
						row.original.inboundShipmentItem?.inbound.supplier.name ||
						"Unassigned"
					}
				/>
			),
		},
		{
			id: "actions",
			header: "",
			...sizes.custom(72, 96, 80),
			enableResizing: false,
			enableHiding: false,
			meta: {
				headerLabel: "Actions",
				skeleton: { type: "icon" },
				className: sizeClass(
					sizes.custom(72, 96, 80),
					"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
				),
				contentClassName: "flex justify-end",
			},
			cell: () => actionButton("/inventory/inbounds", "Open inbound"),
		},
	];

export const allocationColumns: ColumnDef<InventoryItemAllocationRow>[] = [
	{
		id: "variant",
		header: "Variant",
		...sizes.custom(160, 260, 190),
		enableResizing: true,
		enableHiding: false,
		meta: {
			sticky: true,
			headerLabel: "Variant",
			skeleton: { type: "text", width: "w-32" },
			className: sizeClass(
				sizes.custom(160, 260, 190),
				"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
		},
		cell: ({ row }) => (
			<div className="min-w-0">
				<TextWithTooltip
					className="max-w-full truncate font-medium uppercase"
					text={row.original.variantSku || "Variant"}
				/>
				<p className="truncate text-xs text-muted-foreground">
					{row.original.lineItemComponent.parent.title || "Line item"}
				</p>
			</div>
		),
	},
	{
		id: "sale",
		header: "Sale",
		...sizes.custom(132, 210, 154),
		enableResizing: true,
		meta: {
			headerLabel: "Sale",
			skeleton: { type: "text", width: "w-24" },
			className: sizeClass(sizes.custom(132, 210, 154)),
		},
		cell: ({ row }) => (
			<span className="font-mono text-sm">
				{row.original.lineItemComponent.parent.sale?.orderId || "No sale"}
			</span>
		),
	},
	{
		id: "quantity",
		header: "Qty",
		...sizes.custom(88, 120, 96),
		enableResizing: true,
		meta: {
			headerLabel: "Qty",
			skeleton: { type: "text", width: "w-14" },
			className: sizeClass(sizes.custom(88, 120, 96), "text-right"),
			contentClassName: "justify-end",
		},
		cell: ({ row }) => <span>{formatQty(row.original.qty)}</span>,
	},
	{
		id: "status",
		header: "Status",
		accessorKey: "status",
		...sizes.custom(120, 170, 132),
		enableResizing: true,
		meta: {
			headerLabel: "Status",
			skeleton: { type: "badge", width: "w-24" },
			className: sizeClass(sizes.custom(120, 170, 132)),
		},
		cell: ({ row }) => (
			<Badge
				variant="outline"
				className={cn("capitalize", statusClassName(row.original.status))}
			>
				{statusLabel(row.original.status)}
			</Badge>
		),
	},
	{
		id: "actions",
		header: "",
		...sizes.custom(72, 96, 80),
		enableResizing: false,
		enableHiding: false,
		meta: {
			headerLabel: "Actions",
			skeleton: { type: "icon" },
			className: sizeClass(
				sizes.custom(72, 96, 80),
				"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
			contentClassName: "flex justify-end",
		},
		cell: () => actionButton("/inventory/allocations", "Open allocations"),
	},
];

export const relatedLineColumns: ColumnDef<InventoryItemRelatedLineRow>[] = [
	{
		id: "order",
		header: "Order",
		...sizes.custom(150, 240, 170),
		enableResizing: true,
		enableHiding: false,
		meta: {
			sticky: true,
			headerLabel: "Order",
			skeleton: { type: "text", width: "w-28" },
			className: sizeClass(
				sizes.custom(150, 240, 170),
				"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
		},
		cell: ({ row }) => (
			<div className="min-w-0">
				<TextWithTooltip
					className="max-w-full truncate font-mono font-medium uppercase"
					text={row.original.sale?.orderId || row.original.uid || "Sales line"}
				/>
				<p className="truncate text-xs text-muted-foreground">
					{row.original.kind === "quotes" ? "Quote" : "Order"}
				</p>
			</div>
		),
	},
	{
		id: "customer",
		header: "Customer",
		...sizes.custom(200, 360, 240),
		enableResizing: true,
		meta: {
			headerLabel: "Customer",
			skeleton: { type: "text", width: "w-40" },
			className: sizeClass(sizes.custom(200, 360, 240)),
		},
		cell: ({ row }) => (
			<TextWithTooltip
				className="max-w-full truncate text-sm"
				text={
					row.original.sale?.customer?.businessName ||
					row.original.sale?.customer?.name ||
					"No customer"
				}
			/>
		),
	},
	{
		id: "line",
		header: "Line",
		...sizes.custom(200, 360, 240),
		enableResizing: true,
		meta: {
			headerLabel: "Line",
			skeleton: { type: "text", width: "w-40" },
			className: sizeClass(sizes.custom(200, 360, 240)),
		},
		cell: ({ row }) => (
			<TextWithTooltip
				className="max-w-full truncate text-sm text-muted-foreground"
				text={row.original.title || "Inventory line"}
			/>
		),
	},
	{
		id: "quantity",
		header: "Qty",
		...sizes.custom(88, 120, 96),
		enableResizing: true,
		meta: {
			headerLabel: "Qty",
			skeleton: { type: "text", width: "w-14" },
			className: sizeClass(sizes.custom(88, 120, 96), "text-right"),
			contentClassName: "justify-end",
		},
		cell: ({ row }) => <span>{formatQty(row.original.qty)}</span>,
	},
	{
		id: "total",
		header: "Total",
		...sizes.custom(104, 140, 116),
		enableResizing: true,
		meta: {
			headerLabel: "Total",
			skeleton: { type: "text", width: "w-16" },
			className: sizeClass(sizes.custom(104, 140, 116), "text-right"),
			contentClassName: "justify-end",
		},
		cell: ({ row }) => <span>{formatMoney(row.original.totalCost)}</span>,
	},
	{
		id: "actions",
		header: "",
		...sizes.custom(72, 96, 80),
		enableResizing: false,
		enableHiding: false,
		meta: {
			headerLabel: "Actions",
			skeleton: { type: "icon" },
			className: sizeClass(
				sizes.custom(72, 96, 80),
				"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
			contentClassName: "flex justify-end",
		},
		cell: ({ row }) => {
			const orderId = row.original.sale?.orderId || "";
			const href =
				row.original.kind === "quotes"
					? `/sales-book/quotes?orderId=${orderId}`
					: `/sales-book/orders?orderId=${orderId}`;

			return actionButton(href, "Open sale");
		},
	},
];
