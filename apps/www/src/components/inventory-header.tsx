"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { InventorySearchFilter } from "./inventory-search-filter";
import { useInventoryParams } from "@/hooks/use-inventory-params";

export function InventoryHeader({}) {
    const { setParams } = useInventoryParams();
    return (
        <div className="flex justify-between">
            <InventorySearchFilter />
            <div className="flex-1"></div>
            <Button
                onClick={(e) => {
                    setParams({
                        productId: -1,
                    });
                }}
            >
                <Icons.Add className="size-4 mr-2" />
                <span>Add Product</span>
            </Button>
        </div>
    );
}

