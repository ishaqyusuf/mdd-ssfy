import { useInventoryForm } from "./form-context";
import { Eye, EyeOff, Package, Plus, Save, Tag } from "lucide-react";
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import FormInput from "@/components/common/controls/form-input";
import { FormCombobox } from "@/components/common/controls/form-combobox";
import { INVENTORY_STATUS_OPTIONS } from "@sales/constants";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import { Label } from "@gnd/ui/label";
import { FormDescription } from "@gnd/ui/form";
import { cn } from "@gnd/ui/cn";
import { Separator } from "@gnd/ui/separator";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { useFieldArray } from "react-hook-form";
import { useDebugConsole } from "@/hooks/use-debug-console";
import { generateSKU, selectOptions } from "@gnd/utils";
import {
    ProductVariantProvider,
    useProduct,
    useProductVariant,
} from "./context";
import { Card } from "@gnd/ui/card";
import { ProductVariants } from "./product-variants";

export function ProductVariantsSection({}) {
    const form = useInventoryForm();
    const context = useProduct();
    const { attributes, inventoryId, variantFields } = context;
    function addAttribute(variantIndex) {}

    function addVariant() {}

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Tag className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">
                        Stock Variants & Pricings
                    </h3>
                    <Badge variant="secondary" className="ml-2">
                        {variantFields.length}
                    </Badge>
                </div>
                {/* <Button
                    disabled={noAttributes}
                    type="button"
                    onClick={addVariant}
                    size="sm"
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Variant
                </Button> */}
            </div>
            {inventoryId ? (
                <>
                    <ProductVariants inventoryId={inventoryId} />
                </>
            ) : (
                <Card className="p-8">
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                            <Save className="h-8 w-8 text-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-lg font-semibold text-gray-900">
                                Save Product First
                            </h4>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Please save this product first to configure
                                variants. Once saved, you'll be able to add and
                                manage multiple product variants with different
                                attributes, pricing, and inventory levels.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-50 px-3 py-2 rounded-md">
                            <Package className="h-4 w-4" />
                            <span>Variants will be available after saving</span>
                        </div>
                    </div>
                </Card>
            )}
            {/* {variantFields.map((field, variantIndex) => (
                <ProductVariantProvider
                    args={[
                        {
                            variantIndex,
                        },
                    ]}
                    key={field._id}
                >
                    <ProductVariantSection />
                </ProductVariantProvider>
            ))} */}
        </div>
    );
}

function ProductVariantSection() {
    const context = useProduct();
    const form = useInventoryForm();
    const { attributes, noAttributes, variantFields } = context;
    const variantContext = useProductVariant();
    const { variantIndex } = variantContext;
    return (
        <AccordionItem value={`variant-${variantIndex}`}>
            <AccordionTrigger className="">
                <div className="flex gap-4 items-center">
                    {/* <Package className="size-4" /> */}
                    <span>
                        {noAttributes ? "Stock" : `Variant ${variantIndex + 1}`}
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
                    {variantContext?.attributeFields?.map((attribute, i) => (
                        <div className="grid grid-cols-2" key={i}>
                            <FormCombobox
                                comboProps={{
                                    items: selectOptions(
                                        context.attributes,
                                        "name",
                                        "attributeId",
                                    ),
                                }}
                                name={`variants.${variantIndex}.attributes.${i}.attributeId`}
                                control={form.control}
                                transformSelectionValue={(v) => Number(v.id)}
                            />
                        </div>
                    ))}
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

