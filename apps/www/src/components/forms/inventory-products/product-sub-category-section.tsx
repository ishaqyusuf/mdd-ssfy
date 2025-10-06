import { Package, Save } from "lucide-react";
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import Button from "@/components/common/button";
import { useProduct } from "./context";
import { Card } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { useFieldArray, useForm } from "react-hook-form";
import { useInventoryForm } from "./form-context";
import { Fragment } from "react";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";
import { FormCombobox } from "@/components/common/controls/form-combobox";
import { labelValueOptions, selectOptions } from "@gnd/utils";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { ComboxBox } from "@/components/(clean-code)/custom/controlled/combo-box";

export function ProductSubCategorySection({}) {
    const context = useProduct();
    const { attributes, inventoryId, variantFields } = context;
    const form = useInventoryForm();
    const subCatArray = useFieldArray({
        control: form.control,
        name: "subCategories",
        keyName: "_id",
    });
    const nav = useInventoryTrpc({
        enableCategoryList: true,
    });
    // const subCatUpdated = (index, valueData) => {
    //     const data = subCatArray.fields[index];
    //     const values = [...data.values];
    //     const valueIndex = values.findIndex((v) => v.id === valueData.id);
    //     if (valueIndex > -1) values[valueIndex] = valueData;
    //     else values.push(valueData);
    //     subCatArray.update(index, {
    //         ...data,
    //         values,
    //     });
    // };
    return (
        <AccordionItem value="subcategories">
            <AccordionTrigger className="flex">
                <div className="flex gap-4  flex-1 items-center">
                    <Package className="size-4" />
                    <span>Product Sub Categories</span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="">
                {inventoryId ? (
                    <div className="grid gap-4">
                        <div className="flex">
                            <div>
                                <div className="w-4/5">
                                    With sub categories, inventories are
                                    properly refined based on search parameters.
                                </div>
                            </div>
                            <Button
                                disabled={subCatArray.fields.some(
                                    (a) => !a.categoryId,
                                )}
                                onClick={(e) => {
                                    subCatArray.append({
                                        categoryId: null,
                                        valueIds: [],
                                    });
                                }}
                                variant="secondary"
                                className=""
                            >
                                <Icons.Add className="size-4" />
                                Add
                            </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {subCatArray.fields.map((f, i) => (
                                <Fragment key={i}>
                                    <div className="">
                                        <FormCombobox
                                            control={form.control}
                                            name={`subCategories.${i}.categoryId`}
                                            label={i != 0 ? null : "Category"}
                                            transformSelectionValue={(data) =>
                                                Number(data.id)
                                            }
                                            comboProps={{
                                                items: selectOptions(
                                                    nav.categoryList,
                                                    "title",
                                                    "id",
                                                ),
                                                placeholder: "Select  Category",
                                            }}
                                        />
                                    </div>
                                    {/* <div className=""></div> */}
                                    <div className="col-span-2">
                                        <SubCategoryValues
                                            // subCatUpdated={subCatUpdated}
                                            index={i}
                                        />
                                    </div>
                                </Fragment>
                            ))}
                        </div>
                    </div>
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
                                    variants. Once saved, you'll be able to add
                                    and manage multiple product variants with
                                    different attributes, pricing, and inventory
                                    levels.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-50 px-3 py-2 rounded-md">
                                <Package className="h-4 w-4" />
                                <span>
                                    Variants will be available after saving
                                </span>
                            </div>
                        </div>
                    </Card>
                )}
            </AccordionContent>
        </AccordionItem>
    );
}
// function
function SubCategoryValues({ index }) {
    const trpc = useTRPC();
    const ctx = useProduct();
    const form = useInventoryForm();
    const categoryId = form.watch(`subCategories.${index}.categoryId`);
    const { data, error } = useQuery(
        trpc.inventories.inventoryProducts.queryOptions(
            {
                categoryId,
                // size:
            },
            {
                enabled: !!categoryId,
            },
        ),
    );
    // const valueArray = useFieldArray({
    //     control: form.control,
    //     name: `subCategories.${index}.values`,
    // });
    const { mutate, mutateAsync } = useMutation(
        trpc.inventories.updateSubCategory.mutationOptions({}),
    );
    function handleSelect(valueInventoryId, selected, callback) {
        mutateAsync({
            categoryId,
            valueInventoryId: Number(valueInventoryId),
            inventoryId: ctx.inventoryId,
        }).then((result) => {
            console.log(result);
            callback();
            // subCatUpdated(index, {
            //     id: result.id,
            //     deleted: !selected,
            //     inventoryId: ctx.inventoryId,
            // });
        });
    }
    return (
        <>
            <ComboxBox
                className="h-9 w-full"
                maxSelection={5}
                maxStack={4}
                options={labelValueOptions(data?.data, "title", "id")}
                control={form.control}
                name={`subCategories.${index}.valueIds`}
                label={index == 0 ? "Values" : undefined}
                handleSelect={handleSelect}
            />
        </>
    );
}

