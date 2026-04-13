"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useInventoryCategoryParams } from "@/hooks/use-inventory-category-params";
import { useInventoryFilterParams } from "@/hooks/use-inventory-filter-params";

export function CategoryHeader({}) {
    const { setParams } = useInventoryCategoryParams();
    const { filters, setFilters } = useInventoryFilterParams();
    const productKind = filters.productKind || "inventory";
    return (
        <div className="flex justify-between">
            <div className="flex items-center gap-2 rounded-lg border p-1">
                <Button
                    type="button"
                    size="sm"
                    variant={
                        productKind === "inventory" ? "default" : "ghost"
                    }
                    onClick={() => setFilters({ productKind: "inventory" })}
                >
                    Inventory Categories
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={
                        productKind === "component" ? "default" : "ghost"
                    }
                    onClick={() => setFilters({ productKind: "component" })}
                >
                    Component Categories
                </Button>
            </div>
            <div className="flex-1"></div>
            <Button
                onClick={(e) => {
                    setParams({
                        editCategoryId: -1,
                    });
                }}
            >
                <Icons.Add className="size-4 mr-2" />
                <span>Add Category</span>
            </Button>
        </div>
    );
}
