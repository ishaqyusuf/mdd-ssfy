import { useInventoryParams } from "@/hooks/use-inventory-params";
import { useTRPC } from "@/trpc/client";
import {
    CustomSheet,
    CustomSheetContent,
    CustomSheetContentPortal,
    SheetHeader,
} from "./custom-sheet-content";
import { FormContext } from "../forms/inventory-products/form-context";
import { InventoryForm } from "../forms/inventory-products/inventory-form";
import { useQuery } from "@tanstack/react-query";
import { SheetFooter } from "@gnd/ui/sheet";
import { InventoryFormAction } from "../forms/inventory-products/inventory-form-action";

export function InventoryProductSheet() {
    const trpc = useTRPC();
    const { setParams, ...params } = useInventoryParams();
    const isOpen = !!params.productId;

    const handleOnOpenChange = (open: boolean) => {
        if (!open) {
        }
        setParams(null);
    };
    const { data: formData, error } = useQuery(
        trpc.inventories.inventoryForm.queryOptions(
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
                <SheetHeader.Description>
                    {formData?.product?.name}
                </SheetHeader.Description>
            </SheetHeader>
            <CustomSheetContent className="">
                <FormContext data={formData}>
                    <InventoryForm />
                    <CustomSheetContentPortal>
                        <SheetFooter className="w-full border-t">
                            <InventoryFormAction onCancel={(e) => {}} />
                        </SheetFooter>
                    </CustomSheetContentPortal>
                </FormContext>
            </CustomSheetContent>
        </CustomSheet>
    );
}

