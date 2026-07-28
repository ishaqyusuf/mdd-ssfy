"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { resolveWorkflowComponentImageSrc } from "@gnd/sales/sales-form";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { Switch } from "@gnd/ui/switch";
import type { ColumnDef } from "@tanstack/react-table";

export type ShelfItemRow =
	RouterOutputs["salesShelfItems"]["listProducts"]["data"][number];

export type ShelfItemsTableMeta = {
	isTogglingProductId?: number | null;
	onEdit: (product: ShelfItemRow) => void;
	onToggle: (product: ShelfItemRow, enabled: boolean) => void;
};

type Column = ColumnDef<ShelfItemRow>;

function getMeta(table: unknown): ShelfItemsTableMeta | undefined {
	return (
		table as {
			options?: { meta?: ShelfItemsTableMeta };
		}
	).options?.meta;
}

function money(value?: number | null) {
	if (value == null || Number.isNaN(Number(value))) return "-";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value));
}

function categoryLabel(product: ShelfItemRow) {
	return (
		product.categoryPath?.map((category) => category.name).join(" / ") || "-"
	);
}

export function getShelfItemRowId(row: ShelfItemRow) {
	return String(row.id);
}

const productColumn: Column = {
	id: "product",
	header: "Product",
	accessorKey: "title",
	...sizes.custom(200, 360, 240),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "avatar-text", width: "w-44" },
		headerLabel: "Product",
		className: sizeClass(
			sizes.custom(200, 360, 240),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => {
		const product = row.original;
		const imageSrc = product.img
			? resolveWorkflowComponentImageSrc(product.img) || product.img
			: null;

		return (
			<div className="flex min-w-0 items-center gap-2">
				<div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
					{imageSrc ? (
						<img
							src={imageSrc}
							alt={product.title}
							className="size-full object-cover"
						/>
					) : (
						<Icons.Package className="size-5 text-muted-foreground" />
					)}
				</div>
				<div className="min-w-0">
					<TextWithTooltip
						className="max-w-full truncate font-medium uppercase"
						text={product.title || "Untitled shelf product"}
					/>
					<p className="truncate text-xs text-muted-foreground">
						Product #{product.id}
					</p>
				</div>
			</div>
		);
	},
};

const categoryColumn: Column = {
	id: "category",
	header: "Category",
	...sizes.custom(160, 280, 200),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Category",
		className: sizeClass(sizes.custom(160, 280, 200)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm text-muted-foreground"
			text={categoryLabel(row.original)}
		/>
	),
};

const priceColumn: Column = {
	id: "price",
	header: "Price",
	accessorKey: "unitPrice",
	...sizes.custom(92, 132, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Price",
		className: sizeClass(sizes.custom(92, 132, 104), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono font-medium">
			{money(row.original.unitPrice)}
		</span>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	...sizes.custom(128, 220, 150),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(128, 220, 150)),
	},
	cell: ({ row }) => {
		const product = row.original;

		return (
			<div className="flex min-w-0 flex-wrap items-center gap-2">
				<Badge variant={product.effectiveActive ? "default" : "secondary"}>
					{product.effectiveActive ? "Active" : "Hidden"}
				</Badge>
				{product.active && !product.categoryActive ? (
					<Badge variant="outline">Category disabled</Badge>
				) : null}
			</div>
		);
	},
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(104, 132, 116),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(104, 132, 116),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const product = row.original;
		const isToggling =
			meta?.isTogglingProductId != null &&
			meta.isTogglingProductId === product.id;

		return (
			<div className="flex items-center justify-end gap-2">
				<Switch
					checked={product.active}
					disabled={isToggling}
					onCheckedChange={(enabled) => meta?.onToggle(product, enabled)}
					onClick={(event) => event.stopPropagation()}
					aria-label={`Toggle ${product.title}`}
				/>
				<Button
					type="button"
					size="icon"
					variant="ghost"
					aria-label={`Edit ${product.title}`}
					onClick={(event) => {
						event.stopPropagation();
						meta?.onEdit(product);
					}}
				>
					<Icons.Edit className="size-4" />
				</Button>
			</div>
		);
	},
};

export const columns: Column[] = [
	productColumn,
	categoryColumn,
	priceColumn,
	statusColumn,
	actionsColumn,
];
