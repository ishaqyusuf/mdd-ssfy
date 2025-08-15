import { Form } from "@gnd/ui/form";
import { useInventoryCategoryParams } from "@/hooks/use-inventory-category-params";
import { useInventoryCategoryForm } from "./form-context";
import FormInput from "@/components/common/controls/form-input";
import FormSwitch from "@/components/common/controls/form-switch";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";
import { FormCombobox } from "@/components/common/controls/form-combobox";
import { selectOptions } from "@gnd/utils";
import { Separator } from "@gnd/ui/separator";
import { useFieldArray } from "react-hook-form";
import { Label } from "@gnd/ui/label";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { X } from "lucide-react";
import { useDebugConsole } from "@/hooks/use-debug-console";

export function InventoryCategoryForm({}) {
    const form = useInventoryCategoryForm();
    const { editCategoryId: categoryId } = useInventoryCategoryParams();
    const { categoryList } = useInventoryTrpc({
        enableCategoryList: true,
    });
    function removeVariantCategory(id, index) {
        remove(index);
    }
    const { updateCategoryVariantAttribute: updateCatVariantAttr } =
        useInventoryTrpc();
    function selectVariantCategory(id) {
        const fieldIndex = fields.findIndex(
            (f) => f.valuesInventoryCategoryId === id,
        );
        const field = fields[fieldIndex];
        if (field?.active) return;
        updateCatVariantAttr.mutate(
            {
                active: true,
                inventoryCategoryId: categoryId,
                valuesInventoryCategoryId: id,
                id: field?.id,
            },
            {
                onSuccess(data, variables, context) {
                    if (fieldIndex > 0)
                        update(fieldIndex, {
                            ...field,
                            active: true,
                        });
                    else
                        append({
                            active: true,
                            id: data.id,
                            // inventoryCategoryId: data.inventoryCategoryId,
                            valuesInventoryCategoryId:
                                data.valuesInventoryCategoryId,
                        });
                },
            },
        );
    }
    const { fields, remove, update, append } = useFieldArray({
        control: form.control,
        name: "categoryVariantAttributes",
        keyName: "_id",
    });
    return (
        <Form {...form}>
            <div className="grid gap-4">
                <FormInput
                    label="Category Title"
                    control={form.control}
                    name="title"
                />
                <FormInput
                    label="Description"
                    control={form.control}
                    name="description"
                />
                <FormSwitch
                    label={`Product Pricing`}
                    switchLabel={{
                        active: "Price Enabled",
                        inactive: "Price Disabled",
                    }}
                    description={{
                        active: "Products in this category will have pricing fields enabled",
                        inactive:
                            "Products in this category will not show pricing fields",
                    }}
                    control={form.control}
                    name="enablePricing"
                />
                <Separator className="" />
                <FormCombobox
                    control={form.control}
                    name="categoryIdSelector"
                    label="Variation Categories (Optional)"
                    comboProps={{
                        onSelect(item) {
                            selectVariantCategory(Number(item.id));
                        },
                        items: selectOptions(categoryList, "title", "id"),
                        placeholder: "Select Variation Categories",
                    }}
                />
                {fields.length > 0 && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            Selected Variation Categories:
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {fields.map(
                                (
                                    { id, active, valuesInventoryCategoryId },
                                    index,
                                ) => {
                                    if (!active) return null;
                                    const depCat = categoryList.find(
                                        (c) =>
                                            c.id === valuesInventoryCategoryId,
                                    );
                                    return (
                                        <VariationCategory
                                            removeVariantCategory={() =>
                                                removeVariantCategory(id, index)
                                            }
                                            title={depCat?.title}
                                            id={id}
                                            key={id}
                                        />
                                    );
                                },
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Form>
    );
}

function VariationCategory({ id, title, removeVariantCategory }) {
    const { updateCategoryVariantAttribute: update } = useInventoryTrpc();
    useDebugConsole(update.data, update.error);
    return (
        <Badge key={id} variant="secondary" className="gap-1">
            {title || "Unknown"}
            <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={update.isPending}
                className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                onClick={() =>
                    update.mutate(
                        {
                            id,
                            active: false,
                        },
                        {
                            onSuccess(data, variables, context) {
                                removeVariantCategory();
                            },
                        },
                    )
                }
            >
                <X className="h-3 w-3" />
            </Button>
        </Badge>
    );
}

