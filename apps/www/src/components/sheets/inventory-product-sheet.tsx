import { useInventoryProductParams } from "@/hooks/use-inventory-product-params";
import { useTRPC } from "@/trpc/client";
import {
    CustomSheet,
    CustomSheetContent,
    SheetHeader,
} from "./custom-sheet-content";
import { FormContext } from "../forms/inventory-products/form-context";
import { InventoryProductForm } from "../forms/inventory-products/inventory-product-form";

export function InventoryProductSheet() {
    const trpc = useTRPC();
    const { setParams, ...params } = useInventoryProductParams();
    const isOpen = !!params.productId;

    const handleOnOpenChange = (open: boolean) => {
        if (!open) {
        }
        setParams(null);
    };
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
                <SheetHeader.Title>Title</SheetHeader.Title>
            </SheetHeader>
            <CustomSheetContent className="">
                <FormContext>
                    <InventoryProductForm />
                </FormContext>
            </CustomSheetContent>
        </CustomSheet>
    );
}

