"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { InvoiceProductsSearchFilter } from "./inventory-products-search-filter";
import { useInventoryProductParams } from "@/hooks/use-inventory-product-params";

export function InventoryHeader({}) {
    const { setParams } = useInventoryProductParams();
    return (
        <div className="flex justify-between">
            <InvoiceProductsSearchFilter />
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

