import { useInventoryParams } from "@/hooks/use-inventory-params";
import { useTRPC } from "@/trpc/client";
import {
    CustomSheet,
    CustomSheetContent,
    SheetHeader,
} from "./custom-sheet-content";
import { FormContext } from "../forms/inventory-products/form-context";
import { InventoryProductForm } from "../forms/inventory-products/inventory-product-form";
import { useQuery } from "@tanstack/react-query";

export function InventoryProductSheet() {
    const trpc = useTRPC();
    const { setParams, ...params } = useInventoryParams();
    const isOpen = !!params.productId;

    const handleOnOpenChange = (open: boolean) => {
        if (!open) {
        }
        setParams(null);
    };
    const { data: formData } = useQuery(
        trpc.sales.inventoryForm.queryOptions(
            {
                id: params.productId,
            },
            {
                enabled: params?.productId > 0,
            },
        ),
    );
    return (
        <CustomSheet
            sheetName="Inventory-product"
            title={`Inventory Product`}
            open={isOpen}
            size="2xl"
            floating
            onOpenChange={handleOnOpenChange}
        >
            <SheetHeader>
                <SheetHeader.Title>
                    {params.productId > 0
                        ? "Edit Inventory"
                        : "Create Inventory"}
                </SheetHeader.Title>
            </SheetHeader>
            <CustomSheetContent className="">
                <FormContext data={formData}>
                    <InventoryProductForm />
                </FormContext>
            </CustomSheetContent>
        </CustomSheet>
    );
}

