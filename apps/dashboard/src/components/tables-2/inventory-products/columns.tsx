"use client";

import ConfirmBtn from "@/components/confirm-button";
import { StockModeStatus } from "@/components/stock-mode-status";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { FormatAmount } from "@gnd/ui/custom/format-amount";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { imageUrl } from "@gnd/utils";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type InventoryProduct =
	RouterOutputs["inventories"]["inventoryProducts"]["data"][number];

type Column = ColumnDef<InventoryProduct>;

export function getInventoryProductRowId(item: InventoryProduct) {
	return String(item.id);
}

function getInventoryImageSrc(item: InventoryProduct) {
	if (!item.img?.path) return null;

	return imageUrl({
		bucket: item.img.bucket,
		path: item.img.path,
		provider: item.img.provider,
	});
}

function ProductCell({ item }: { item: InventoryProduct }) {
	const imageSrc = getInventoryImageSrc(item);

	return (
		<div className="flex min-w-0 items-center gap-3">
			<div className="size-10 shrink-0 overflow-hidden rounded border bg-muted">
				{imageSrc ? (
					<img
						src={imageSrc}
						alt={item.title}
						className="h-full w-full object-cover"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center">
						<Icons.Package className="size-5 text-muted-foreground" />
					</div>
				)}
			</div>
			<div className="min-w-0 space-y-1">
				<TextWithTooltip
					className="max-w-full truncate font-semibold uppercase"
					text={item.title || "-"}
				/>
				<div className="flex min-w-0 flex-wrap items-center gap-1.5">
					{item.category ? (
						<Badge variant="secondary" className="max-w-[160px] truncate">
							{item.category}
						</Badge>
					) : null}
					<Badge variant="outline" className="capitalize">
						{item.productKind || "inventory"}
					</Badge>
					{item.sourceCustom ? <Badge variant="secondary">Custom</Badge> : null}
					{item.stockStatus ? (
						<Badge variant="destructive" className="whitespace-nowrap">
							{item.stockStatus}
						</Badge>
					) : null}
				</div>
			</div>
		</div>
	);
}

function StatusCell({ item }: { item: InventoryProduct }) {
	return (
		<Progress>
			<Progress.Status>{item.status}</Progress.Status>
		</Progress>
	);
}

function StockValueCell({ value }: { value: unknown }) {
	if (value == null) {
		return <span className="block text-right text-muted-foreground">-</span>;
	}

	const amount = Number(value);

	return (
		<span className="block text-right font-mono font-medium">
			{Number.isFinite(amount) ? (
				<FormatAmount amount={amount} maximumFractionDigits={0} />
			) : (
				"-"
			)}
		</span>
	);
}

function InventoryProductActions({ item }: { item: InventoryProduct }) {
	const { setParams } = useInventoryParams();
	const inventory = useInventoryTrpc();

	return (
		<div className="flex items-center justify-center gap-1">
			<Button asChild variant="ghost" size="icon" className="size-8">
				<Link href={`/inventory/${item.id}`}>
					<Icons.Eye className="size-4" />
				</Link>
			</Button>
			<Button
				variant="ghost"
				size="icon"
				className="size-8"
				onClick={() => {
					setParams({
						productId: item.id,
					});
				}}
			>
				<Icons.Edit className="size-4" />
			</Button>
			<ConfirmBtn
				trash
				size="icon"
				onClick={() => {
					inventory.deleteInventory(item.id);
				}}
			/>
		</div>
	);
}

const selectColumn: Column = {
	id: "select",
	...sizes.custom(50, 50),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "checkbox" },
		className: sizeClass(
			sizes.custom(50, 50),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
		),
		contentClassName: "flex items-center justify-center",
	},
	cell: ({ row }) => (
		<Checkbox
			checked={row.getIsSelected()}
			onCheckedChange={(checked) => {
				if (checked === "indeterminate") {
					row.toggleSelected();
				} else {
					row.toggleSelected(checked);
				}
			}}
		/>
	),
};

export const columns: Column[] = [
	selectColumn,
	{
		id: "product",
		header: "Product",
		accessorKey: "title",
		...sizes.custom(260, 520, 320),
		enableResizing: true,
		enableHiding: false,
		meta: {
			sticky: true,
			skeleton: { type: "avatar-text" },
			headerLabel: "Product",
			className: sizeClass(
				sizes.custom(260, 520, 320),
				"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
		},
		cell: ({ row }) => <ProductCell item={row.original} />,
	},
	{
		id: "status",
		header: "Status",
		accessorKey: "status",
		...sizes.custom(110, 180, 130),
		enableResizing: true,
		meta: {
			skeleton: { type: "badge" },
			headerLabel: "Status",
			className: sizeClass(sizes.custom(110, 180, 130)),
		},
		cell: ({ row }) => <StatusCell item={row.original} />,
	},
	{
		id: "stockMode",
		header: "Stock Mode",
		accessorKey: "stockMode",
		...sizes.custom(140, 220, 170),
		enableResizing: true,
		meta: {
			skeleton: { type: "icon-text" },
			headerLabel: "Stock Mode",
			className: sizeClass(sizes.custom(140, 220, 170)),
		},
		cell: ({ row }) => <StockModeStatus status={row.original.stockMode} />,
	},
	{
		id: "variantCount",
		header: "Variants",
		accessorKey: "variantCount",
		...sizes.custom(90, 140, 110),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-12" },
			headerLabel: "Variants",
			className: sizeClass(sizes.custom(90, 140, 110), "text-center"),
		},
		cell: ({ row }) => (
			<span className="block text-center font-mono font-medium">
				{row.original.variantCount ?? 0}
			</span>
		),
	},
	{
		id: "totalStocks",
		header: "Total Stock",
		accessorKey: "totalStocks",
		...sizes.custom(110, 170, 130),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-16" },
			headerLabel: "Total Stock",
			className: sizeClass(sizes.custom(110, 170, 130), "text-center"),
		},
		cell: ({ row }) => (
			<span className="block text-center text-muted-foreground">
				{row.original.totalStocks ?? "-"}
			</span>
		),
	},
	{
		id: "stockValue",
		header: "Stock Value",
		accessorKey: "stockValue",
		...sizes.custom(120, 180, 140),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-20" },
			headerLabel: "Stock Value",
			className: sizeClass(sizes.custom(120, 180, 140), "text-right"),
		},
		cell: ({ row }) => <StockValueCell value={row.original.stockValue} />,
	},
	{
		id: "actions",
		header: "",
		...sizes.custom(130, 170, 150),
		enableResizing: false,
		enableHiding: false,
		enableSorting: false,
		meta: {
			skeleton: { type: "icon" },
			headerLabel: "Actions",
			className: sizeClass(
				sizes.custom(130, 170, 150),
				"bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary",
			),
		},
		cell: ({ row }) => <InventoryProductActions item={row.original} />,
	},
];
