"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useInventoryCategoryParams } from "@/hooks/use-inventory-category-params";

export function CategoryHeader({}) {
    const { setParams } = useInventoryCategoryParams();
    return (
        <div className="flex justify-between">
            {/* <InventorySearchFilter /> */}
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

