import { useVariant } from "./context";
import { useInventoryForm } from "./form-context";
import { FormCombobox } from "@/components/common/controls/form-combobox";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import FormInput from "@/components/common/controls/form-input";
import { useFieldArray } from "react-hook-form";
import { Button } from "@gnd/ui/button";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { selectOptions } from "@gnd/utils";

export function VariantSupplierPricingForm() {
    const variant = useVariant();
    const form = useInventoryForm();
    const trpc = useTRPC();
    const supplierRows = useFieldArray({
        control: form.control,
        name: "supplierVariants",
        keyName: "_id",
    });
    const suppliers = form.watch("suppliers") || [];
    const rows = supplierRows.fields
        .map((field, index) => ({
            field,
            index,
        }))
        .filter(
            ({ index }) =>
                form.watch(`supplierVariants.${index}.variantUid`) ===
                    variant.data.uid ||
                form.watch(`supplierVariants.${index}.inventoryVariantId`) ===
                    variant.data.variantId,
        );

    const saveSupplierVariantMutation = useMutation(
        trpc.inventories.saveSupplierVariantForm.mutationOptions({
            onSuccess() {
                toast({
                    title: "Supplier pricing updated",
                    variant: "success",
                });
            },
        }),
    );

    const persistRow = (index: number) => {
        const row = form.getValues(`supplierVariants.${index}`);
        if (!row?.supplierId || !variant.data.variantId) return;
        saveSupplierVariantMutation.mutate({
            id: row.id,
            supplierId: Number(row.supplierId),
            inventoryVariantId: Number(variant.data.variantId),
            supplierSku: row.supplierSku || null,
            costPrice: row.costPrice == null ? null : Number(row.costPrice),
            salesPrice: row.salesPrice == null ? null : Number(row.salesPrice),
            minOrderQty:
                row.minOrderQty == null ? null : Number(row.minOrderQty),
            leadTimeDays:
                row.leadTimeDays == null ? null : Number(row.leadTimeDays),
            preferred: !!row.preferred,
            active: row.active !== false,
        });
    };

    return (
        <div className="space-y-4 p-4">
            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                        supplierRows.append({
                            id: null,
                            supplierId: undefined as any,
                            inventoryVariantId: variant.data.variantId,
                            variantUid: variant.data.uid,
                            supplierSku: "",
                            costPrice: null,
                            salesPrice: null,
                            minOrderQty: null,
                            leadTimeDays: null,
                            preferred: false,
                            active: true,
                        })
                    }
                >
                    Add Supplier Price
                </Button>
            </div>

            {rows.length ? (
                rows.map(({ field, index }) => (
                    <div
                        key={field._id}
                        className="grid grid-cols-2 gap-4 rounded-lg border p-4"
                    >
                        <FormCombobox
                            label="Supplier"
                            control={form.control}
                            name={`supplierVariants.${index}.supplierId`}
                            transformSelectionValue={(value) => Number(value.id)}
                            comboProps={{
                                items: selectOptions(suppliers, "name", "id"),
                            }}
                        />
                        <FormInput
                            label="Supplier SKU"
                            control={form.control}
                            name={`supplierVariants.${index}.supplierSku`}
                        />
                        <FormInput
                            label="Cost Price"
                            control={form.control}
                            name={`supplierVariants.${index}.costPrice`}
                            type="number"
                        />
                        <FormInput
                            label="Sales Price"
                            control={form.control}
                            name={`supplierVariants.${index}.salesPrice`}
                            type="number"
                        />
                        <FormInput
                            label="Min Order Qty"
                            control={form.control}
                            name={`supplierVariants.${index}.minOrderQty`}
                            type="number"
                        />
                        <FormInput
                            label="Lead Time (Days)"
                            control={form.control}
                            name={`supplierVariants.${index}.leadTimeDays`}
                            type="number"
                        />
                        <FormCheckbox
                            control={form.control}
                            name={`supplierVariants.${index}.preferred`}
                            label="Preferred Supplier"
                        />
                        <FormCheckbox
                            control={form.control}
                            name={`supplierVariants.${index}.active`}
                            label="Active"
                        />
                        <div className="col-span-2 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => supplierRows.remove(index)}
                            >
                                Remove
                            </Button>
                            <Button
                                type="button"
                                onClick={() => persistRow(index)}
                                disabled={saveSupplierVariantMutation.isPending}
                            >
                                Save Supplier Price
                            </Button>
                        </div>
                    </div>
                ))
            ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    No supplier pricing defined for this variant yet.
                </div>
            )}
        </div>
    );
}
