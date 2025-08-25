import { GripVerticalIcon, Package, Save } from "lucide-react";
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import Button from "@/components/common/button";
import { useProduct } from "./context";
import { Card } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { useFieldArray } from "react-hook-form";
import { useInventoryForm } from "./form-context";
import { Fragment, useMemo } from "react";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";
import { FormCombobox } from "@/components/common/controls/form-combobox";
import { labelValueOptions, selectOptions } from "@gnd/utils";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ComboxBox } from "@/components/(clean-code)/custom/controlled/combo-box";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { UniqueIdentifier } from "@dnd-kit/core";
import ConfirmBtn from "@/components/confirm-button";
import { Progress } from "@/components/(clean-code)/progress";

export function CategorySubComponentsSection({}) {
    const context = useProduct();
    const { attributes, inventoryId, subComponentsArray, variantFields } =
        context;
    const form = useInventoryForm();
    const dataIds = useMemo<UniqueIdentifier[]>(
        () => subComponentsArray?.fields?.map(({ id, _id }) => _id) || [],
        [subComponentsArray.fields],
    );
    const nav = useInventoryTrpc({
        enableCategoryList: true,
    });
    return (
        <AccordionItem value="subComponents">
            <AccordionTrigger className="flex">
                <div className="flex gap-4  flex-1 items-center">
                    <Package className="size-4" />
                    <span>Door Builder Components</span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="">
                {inventoryId ? (
                    <div className="grid gap-4">
                        <div className="flex">
                            <div>
                                <div className="w-5/6 text-sm text-muted-foreground">
                                    Configure the step-by-step components
                                    customers will see when building a complete
                                    <span className="font-bold uppercase">{` ${form.getValues("product.name")} `}</span>
                                    door. Drag to reorder, toggle status, and
                                    optionally set default products for each
                                    category.
                                    {/*  With
                                    door builder, all inventories having{" "}
                                    {`${form.getValues("product.name")}`} as
                                    sub-categories will use the sub-components
                                    data for selecting door components just like
                                    in dyke system. */}
                                </div>
                            </div>
                            <Button
                                disabled={subComponentsArray.fields.some(
                                    (a) => !a.inventoryCategoryId,
                                )}
                                onClick={(e) => {
                                    subComponentsArray.append({
                                        parentId: inventoryId,
                                        defaultInventoryId: null,
                                        inventoryCategoryId: null,
                                    });
                                }}
                                variant="secondary"
                                className=""
                            >
                                <Icons.Add className="size-4" />
                                Add
                            </Button>
                        </div>
                        <div>
                            <Table className="table-sm">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-8"></TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Default Product</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="**:data-[slot=table-cell]:first:w-8">
                                    <SortableContext
                                        items={dataIds}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {subComponentsArray.fields.map(
                                            (f, i) => (
                                                <Row id={f._id}>
                                                    <TableCell>
                                                        <FormCombobox
                                                            control={
                                                                form.control
                                                            }
                                                            name={`subComponents.${i}.inventoryCategoryId`}
                                                            transformSelectionValue={(
                                                                data,
                                                            ) =>
                                                                Number(data.id)
                                                            }
                                                            handleSelect={(
                                                                val,
                                                                selected,
                                                                cb,
                                                            ) => {
                                                                const inventoryCategoryId =
                                                                    selected
                                                                        .data
                                                                        .id;
                                                                const __data = {
                                                                    id: f.id,
                                                                    defaultInventoryId:
                                                                        inventoryCategoryId !=
                                                                        f.inventoryCategoryId
                                                                            ? null
                                                                            : undefined,
                                                                    index: i,
                                                                    parentId:
                                                                        inventoryId,
                                                                    status:
                                                                        f.status ||
                                                                        "published",
                                                                    inventoryCategoryId,
                                                                };
                                                                nav.mutSubComponent.mutate(
                                                                    __data,
                                                                    {
                                                                        onSuccess(
                                                                            data,
                                                                            variables,
                                                                            context,
                                                                        ) {
                                                                            subComponentsArray.update(
                                                                                i,
                                                                                {
                                                                                    ...f,
                                                                                    ...__data,
                                                                                },
                                                                            );
                                                                            cb();
                                                                        },
                                                                    },
                                                                );
                                                            }}
                                                            comboProps={{
                                                                // onSelect(item) {
                                                                //     // console.log(item);
                                                                // },
                                                                items: selectOptions(
                                                                    nav.categoryList,
                                                                    "title",
                                                                    "id",
                                                                ),
                                                                placeholder:
                                                                    "Select  Category",
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <SubCategoryValues
                                                            // subCatUpdated={subCatUpdated}
                                                            index={i}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                        >
                                                            <Progress>
                                                                <Progress.Status>
                                                                    {f.status}
                                                                </Progress.Status>
                                                            </Progress>
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell>
                                                        <ConfirmBtn
                                                            trash
                                                            onClick={(e) => {
                                                                if (f.id)
                                                                    nav.deleteSubComponent(
                                                                        f.id,
                                                                    );
                                                                subComponentsArray.remove(
                                                                    i,
                                                                );
                                                            }}
                                                        />
                                                    </TableCell>
                                                </Row>
                                            ),
                                        )}
                                    </SortableContext>
                                </TableBody>
                            </Table>
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
function Row({ children, id }) {
    const {
        transform,
        transition,
        attributes,
        listeners,
        setNodeRef,
        isDragging,
    } = useSortable({
        id,
    });
    return (
        <TableRow className="hover:bg-transparent">
            <TableCell>
                <Button
                    {...attributes}
                    {...listeners}
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:bg-transparent"
                >
                    <GripVerticalIcon className="size-3 text-muted-foreground" />
                    <span className="sr-only">Drag to reorder</span>
                </Button>
            </TableCell>
            {children}
        </TableRow>
    );
}
// function
function SubCategoryValues({ index }) {
    const trpc = useTRPC();
    const ctx = useProduct();
    const form = useInventoryForm();
    const categoryId = form.watch(`subComponents.${index}.inventoryCategoryId`);
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
        trpc.inventories.updateSubComponent.mutationOptions({}),
    );
    function handleSelect(valueInventoryId, selected, callback) {
        mutateAsync({
            parentId: ctx.inventoryId,

            // valueInventoryId: Number(valueInventoryId),
            // inventoryId: ctx.inventoryId,
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
                maxSelection={1}
                // maxStack={4}
                options={labelValueOptions(data?.data, "title", "id")}
                control={form.control}
                name={`subComponents.${index}.defaultInventoryId`}
                // label={index == 0 ? "Default Inventory" : undefined}
                handleSelect={handleSelect}
            />
        </>
    );
}

