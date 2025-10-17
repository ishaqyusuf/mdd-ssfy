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
import { useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { SheetFooter } from "@gnd/ui/sheet";
import { InventoryFormAction } from "../forms/inventory-products/inventory-form-action";
import { useInventoryInboundParams } from "@/hooks/use-inventory-inbound-params";

export function InventoryInboundSheet() {
    const trpc = useTRPC();
    const { setParams, ...params } = useInventoryInboundParams();
    const isOpen = !!params.editInboundId;

    const handleOnOpenChange = (open: boolean) => {
        if (!open) {
        }
        setParams(null);
    };
    const { data: formData, error } = useQuery(
        trpc.inventories.inventoryForm.queryOptions(
            {
                id: params.editInboundId,
            },
            {
                enabled: params?.editInboundId > 0,
            },
        ),
    );

    const qc = useQueryClient();
    return (
        <CustomSheet
            sheetName="Inventory-product"
            open={isOpen}
            size="2xl"
            floating
            onOpenChange={(e) => {
                handleOnOpenChange(e);
            }}
        >
            <SheetHeader>
                <SheetHeader.Title>
                    {params.editInboundId > 0
                        ? "Edit Inbound"
                        : "Create Inbound"}
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

