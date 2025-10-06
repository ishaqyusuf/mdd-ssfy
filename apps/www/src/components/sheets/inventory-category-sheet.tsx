import { useTRPC } from "@/trpc/client";
import {
    CustomSheet,
    CustomSheetContent,
    CustomSheetContentPortal,
    SheetHeader,
} from "./custom-sheet-content";
import { useQuery } from "@gnd/ui/tanstack";
import { SheetFooter } from "@gnd/ui/sheet";
import { useInventoryCategoryParams } from "@/hooks/use-inventory-category-params";
import { FormContext } from "../forms/inventory-category-form/form-context";
import { InventoryCategoryForm } from "../forms/inventory-category-form/inventory-form";
import { FormAction } from "../forms/inventory-category-form/form-action";

export function InventoryCategorySheet() {
    const trpc = useTRPC();
    const { setParams, ...params } = useInventoryCategoryParams();
    const isOpen = !!params.editCategoryId;

    const handleOnOpenChange = (open: boolean) => {
        if (!open) {
        }
        setParams(null);
    };
    const { data: formData, error } = useQuery(
        trpc.inventories.inventoryCategoryForm.queryOptions(
            params.editCategoryId,
            {
                enabled: params?.editCategoryId > 0,
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
                    {params.editCategoryId > 0
                        ? "Edit Category"
                        : "Create Category"}
                </SheetHeader.Title>
            </SheetHeader>
            <CustomSheetContent className="">
                <FormContext data={formData}>
                    <InventoryCategoryForm />
                    <CustomSheetContentPortal>
                        <SheetFooter className="w-full border-t">
                            <FormAction onCancel={(e) => {}} />
                        </SheetFooter>
                    </CustomSheetContentPortal>
                </FormContext>
            </CustomSheetContent>
        </CustomSheet>
    );
}

