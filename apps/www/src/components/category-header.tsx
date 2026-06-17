"use client";

import { useInventoryCategoryParams } from "@/hooks/use-inventory-category-params";
import { useInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { InventorySearchFilter } from "./inventory-search-filter";
import { InventoryCategoriesColumnVisibility } from "./tables-2/inventory-categories/column-visibility";

export function CategoryHeader() {
	const { setParams } = useInventoryCategoryParams();
	const { filters, setFilters } = useInventoryFilterParams();
	const productKind = filters.productKind || "inventory";

	return (
		<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
			<div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center">
				<InventorySearchFilter placeholder="Search Categories" />
				<div className="flex flex-wrap items-center gap-2 rounded-lg border p-1">
					<Button
						type="button"
						size="sm"
						variant={productKind === "inventory" ? "default" : "ghost"}
						onClick={() => setFilters({ productKind: "inventory" })}
					>
						Inventory Categories
					</Button>
					<Button
						type="button"
						size="sm"
						variant={productKind === "component" ? "default" : "ghost"}
						onClick={() => setFilters({ productKind: "component" })}
					>
						Component Categories
					</Button>
				</div>
			</div>
			<div className="flex flex-wrap items-center justify-end gap-2">
				<InventoryCategoriesColumnVisibility />
				<Button
					onClick={() => {
						setParams({
							editCategoryId: -1,
						});
					}}
				>
					<Icons.Add className="size-4 mr-2" />
					<span className="hidden lg:inline">Add Category</span>
				</Button>
			</div>
		</div>
	);
}
