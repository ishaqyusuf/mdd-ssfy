"use client";

import ConfirmBtn from "@/components/confirm-button";
import { StockModeStatus } from "@/components/stock-mode-status";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useInventoryCategoryParams } from "@/hooks/use-inventory-category-params";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { InventoryProductKind } from "@gnd/inventory/schema";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import type { ColumnDef } from "@tanstack/react-table";

type CategoryStockMode = "monitored" | "unmonitored";

export type InventoryCategory = {
	id: number;
	title: string | null;
	description: string | null;
	productKind?: InventoryProductKind | null;
	stockMode?: CategoryStockMode | null;
	type?: string | null;
	_count?: {
		inventories?: number | null;
		categoryVariantAttributes?: number | null;
	} | null;
};

type Column = ColumnDef<InventoryCategory>;

export function getInventoryCategoryRowId(item: InventoryCategory) {
	return String(item.id);
}

function CategoryCell({ item }: { item: InventoryCategory }) {
	return (
		<div className="flex min-w-0 items-center gap-3">
			<div className="flex size-9 shrink-0 items-center justify-center rounded border bg-muted">
				<Icons.Folder className="size-4 text-muted-foreground" />
			</div>
			<div className="min-w-0 space-y-1">
				<TextWithTooltip
					className="max-w-full truncate font-semibold uppercase"
					text={item.title || "-"}
				/>
				<div className="flex min-w-0 flex-wrap items-center gap-1.5">
					{item.type ? (
						<Badge variant="secondary" className="max-w-[160px] truncate">
							{item.type}
						</Badge>
					) : null}
					<Badge variant="outline" className="capitalize">
						{item.productKind || "inventory"}
					</Badge>
				</div>
			</div>
		</div>
	);
}

function DescriptionCell({ item }: { item: InventoryCategory }) {
	if (!item.description) {
		return <span className="text-muted-foreground">-</span>;
	}

	return (
		<TextWithTooltip
			className="block max-w-full truncate text-muted-foreground"
			text={item.description}
		/>
	);
}

function CategoryStockModeCell({ item }: { item: InventoryCategory }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const mutation = useMutation(
		trpc.inventories.updateCategoryStockMode.mutationOptions({
			onSuccess() {
				queryClient.invalidateQueries({
					queryKey: trpc.inventories.inventoryCategories.infiniteQueryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.inventories.inventoryCategoryForm.queryKey(item.id),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.inventories.getInventoryCategories.queryKey(),
				});
				toast({
					title: "Category stock mode updated",
					variant: "success",
				});
			},
		}),
	);
	const stockMode = item.stockMode || "unmonitored";
	const nextStockMode = stockMode === "monitored" ? "unmonitored" : "monitored";

	return (
		<Button
			type="button"
			size="sm"
			variant="outline"
			className="h-8 gap-2 uppercase"
			disabled={mutation.isPending}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				mutation.mutate({
					id: item.id,
					stockMode: nextStockMode,
				});
			}}
		>
			<StockModeStatus status={stockMode} />
			<span>{mutation.isPending ? "Updating..." : stockMode}</span>
		</Button>
	);
}

function InventoryCategoryActions({ item }: { item: InventoryCategory }) {
	const { setParams } = useInventoryCategoryParams();
	const inventory = useInventoryTrpc();

	return (
		<div className="flex items-center justify-center gap-1">
			<Button
				variant="ghost"
				size="icon"
				className="size-8"
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					setParams({
						editCategoryId: item.id,
					});
				}}
			>
				<Icons.Edit className="size-4" />
			</Button>
			<ConfirmBtn
				trash
				size="icon"
				onClick={() => {
					inventory.deleteCategory(item.id);
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
		id: "category",
		header: "Category",
		accessorKey: "title",
		...sizes.custom(260, 520, 320),
		enableResizing: true,
		enableHiding: false,
		meta: {
			sticky: true,
			skeleton: { type: "icon-text" },
			headerLabel: "Category",
			className: sizeClass(
				sizes.custom(260, 520, 320),
				"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
		},
		cell: ({ row }) => <CategoryCell item={row.original} />,
	},
	{
		id: "description",
		header: "Description",
		accessorKey: "description",
		...sizes.custom(240, 520, 320),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-40" },
			headerLabel: "Description",
			className: sizeClass(sizes.custom(240, 520, 320)),
		},
		cell: ({ row }) => <DescriptionCell item={row.original} />,
	},
	{
		id: "stockMode",
		header: "Stock Mode",
		accessorKey: "stockMode",
		...sizes.custom(160, 240, 190),
		enableResizing: true,
		meta: {
			skeleton: { type: "icon-text" },
			headerLabel: "Stock Mode",
			className: sizeClass(sizes.custom(160, 240, 190)),
		},
		cell: ({ row }) => <CategoryStockModeCell item={row.original} />,
	},
	{
		id: "variationCategories",
		header: "Variation Categories",
		accessorFn: (row) => row._count?.categoryVariantAttributes ?? 0,
		...sizes.custom(150, 230, 180),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-12" },
			headerLabel: "Variation Categories",
			className: sizeClass(sizes.custom(150, 230, 180), "text-center"),
		},
		cell: ({ row }) => (
			<span className="block text-center font-mono font-medium">
				{row.original._count?.categoryVariantAttributes ?? 0}
			</span>
		),
	},
	{
		id: "inventories",
		header: "Inventories",
		accessorFn: (row) => row._count?.inventories ?? 0,
		...sizes.custom(110, 170, 130),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-12" },
			headerLabel: "Inventories",
			className: sizeClass(sizes.custom(110, 170, 130), "text-center"),
		},
		cell: ({ row }) => (
			<span className="block text-center font-mono font-medium">
				{row.original._count?.inventories ?? 0}
			</span>
		),
	},
	{
		id: "actions",
		header: "",
		...sizes.custom(120, 160, 130),
		enableResizing: false,
		enableHiding: false,
		enableSorting: false,
		meta: {
			skeleton: { type: "icon" },
			headerLabel: "Actions",
			className: sizeClass(
				sizes.custom(120, 160, 130),
				"bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary",
			),
		},
		cell: ({ row }) => <InventoryCategoryActions item={row.original} />,
	},
];
