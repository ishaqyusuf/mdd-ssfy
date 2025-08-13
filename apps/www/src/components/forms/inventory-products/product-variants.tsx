import FormInput from "@/components/common/controls/form-input";
import { useDebugConsole } from "@/hooks/use-debug-console";
import { useTRPC } from "@/trpc/client";
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import { Button } from "@gnd/ui/button";
import { Separator } from "@gnd/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { useProduct } from "./context";
import { useZodForm } from "@/hooks/use-zod-form";
import { variantFormSchema } from "@sales/schema";

export function ProductVariants({ inventoryId }) {
    const trpc = useTRPC();
    const { data } = useQuery(
        trpc.inventories.inventoryVariants.queryOptions(
            {
                id: inventoryId,
            },
            {
                enabled: !!inventoryId,
            },
        ),
    );
    return <div></div>;
}

function ProductVariantSection({ variantIndex }) {
    const context = useProduct();
    const form = useZodForm(variantFormSchema, {
        defaultValues: {},
    });
    // const form = useInventoryForm();
    const { attributes, noAttributes, variantFields } = context;
    // const variantContext = useProductVariant();
    // const { variantIndex } = variantContext;
    return (
        <AccordionItem value={`variant-${variantIndex}`}>
            <AccordionTrigger className="">
                <div className="flex gap-4 items-center">
                    {/* <Package className="size-4" /> */}
                    <span>
                        {/* {noAttributes ? "Stock" : `Variant ${variantIndex + 1}`} */}
                    </span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="">
                <div className="grid grid-cols-2 gap-4">
                    {!noAttributes || (
                        <>
                            <div className="flex gap-2 items-end">
                                <FormInput
                                    label="SKU"
                                    size="sm"
                                    className="flex-1"
                                    placeholder="Enter SKU"
                                    control={form.control}
                                    name={`variants.${variantIndex}.sku`}
                                />
                                <Button
                                    onClick={(e) => {
                                        form.setValue(
                                            `variants.${variantIndex}.sku`,
                                            generateSKU(),
                                        );
                                    }}
                                    className="h-8"
                                >
                                    Generate
                                </Button>
                            </div>
                            <FormInput
                                label="Variant Name"
                                placeholder="Enter Variant Name"
                                size="sm"
                                control={form.control}
                                name={`variants.${variantIndex}.name`}
                            />
                            <div className="space-y-4 col-span-2">
                                <div className="flex  justify-between items-center">
                                    <Label className="text-sm font-medium">
                                        Attributes
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={variantContext.addAttribute}
                                        className="gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Attribute
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    <Separator className="col-span-2" />

                    <div className="grid col-span-2 grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormInput
                            label="Price"
                            control={form.control}
                            numericProps={{
                                prefix: "$",
                                type: "tel",
                            }}
                            name={`variants.${variantIndex}.price`}
                        />
                        <FormInput
                            label="Cost"
                            control={form.control}
                            numericProps={{
                                prefix: "$",
                                type: "tel",
                            }}
                            name={`variants.${variantIndex}.cost`}
                        />
                        <FormInput
                            label="Stock"
                            control={form.control}
                            numericProps={{
                                type: "tel",
                                // prefix: "$",
                            }}
                            name={`variants.${variantIndex}.stock`}
                        />
                        <FormInput
                            label="Low Stock Alert"
                            control={form.control}
                            numericProps={{
                                // prefix: "$",
                                type: "tel",
                            }}
                            name={`variants.${variantIndex}.lowStockAlert`}
                        />
                    </div>

                    <Separator className="col-span-2" />
                    <ProductImageGallery />
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

