"use client";

import { useInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { useTRPC } from "@/trpc/client";
import type {
	InventoryForm,
	InventoryProductKind,
} from "@gnd/inventory/schema";
import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { useMutation } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { InventorySearchFilter } from "./inventory-search-filter";
import { InventoryProductsColumnVisibility } from "./tables-2/inventory-products/column-visibility";

type Props = {
	defaultProductKind?: InventoryProductKind;
};

export function InventoryHeader({ defaultProductKind = "inventory" }: Props) {
	const { setParams } = useInventoryParams();
	const { filters, setFilters } = useInventoryFilterParams();
	const trpc = useTRPC();
	const backfillKinds = useMutation(
		trpc.inventories.backfillInventoryProductKinds.mutationOptions({
			onSuccess(data) {
				toast({
					title: "Product types updated",
					description: `${data.inventoryCount} inventory items, ${data.componentCount} components, ${data.unchangedCount} unchanged.`,
					variant: "success",
				});
			},
		}),
	);
	const backfillImportSources = useMutation(
		trpc.inventories.backfillInventoryImportSources.mutationOptions({
			onSuccess(data) {
				toast({
					title: "Import source labels updated",
					description: `${data.updated} inventories updated from ${data.matched} Dyke component matches.`,
					variant: "success",
				});
			},
		}),
	);
	const productKind = filters.productKind || defaultProductKind;
	return (
		<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
			<div className="flex flex-col gap-3 md:flex-row md:items-center">
				<InventorySearchFilter />
				<div className="flex flex-wrap items-center gap-2 rounded-lg border p-1">
					<Button
						type="button"
						size="sm"
						variant={!filters.productKind ? "secondary" : "ghost"}
						onClick={() => setFilters({ productKind: null })}
					>
						All
					</Button>
					<Button
						type="button"
						size="sm"
						variant={productKind === "inventory" ? "default" : "ghost"}
						onClick={() => setFilters({ productKind: "inventory" })}
					>
						Inventories
					</Button>
					<Button
						type="button"
						size="sm"
						variant={productKind === "component" ? "default" : "ghost"}
						onClick={() => setFilters({ productKind: "component" })}
					>
						Components
					</Button>
					<Button
						type="button"
						size="sm"
						variant={filters.showCustom ? "default" : "ghost"}
						onClick={() =>
							setFilters({
								showCustom: filters.showCustom ? null : true,
							})
						}
					>
						{filters.showCustom ? "Custom Visible" : "Show Custom"}
					</Button>
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-2 xl:justify-end">
				<InventoryProductsColumnVisibility />
				<Button
					onClick={() => {
						setParams({
							productId: -1,
							defaultValues: {
								product: {
									productKind,
								},
							} as Partial<InventoryForm> as InventoryForm,
						});
					}}
				>
					<Icons.Add className="size-4 mr-2" />
					<span className="hidden lg:inline">
						{productKind === "component" ? "Add Component" : "Add Inventory"}
					</span>
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button type="button" variant="outline" size="icon">
							<Icons.MoreHorizontal className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							disabled={backfillImportSources.isPending}
							onClick={() => backfillImportSources.mutate()}
						>
							<Icons.Refresh className="size-4 mr-2" />
							<span>Backfill Import Labels</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={backfillKinds.isPending}
							onClick={() => backfillKinds.mutate()}
						>
							<Icons.Refresh className="size-4 mr-2" />
							<span>Backfill Types</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
