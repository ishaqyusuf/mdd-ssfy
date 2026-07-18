import Button from "@/components/common/button";
import type { InventoryProductFormSubComponentRow } from "@/components/tables-2/inventory-product-form-sub-components/columns";
import { DataTable as InventoryProductFormSubComponentsTable } from "@/components/tables-2/inventory-product-form-sub-components/data-table";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";
import { useTRPC } from "@/trpc/client";
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import { Card } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { useMutation } from "@gnd/ui/tanstack";
import { selectOptions } from "@gnd/utils";
import { useMemo } from "react";
import { useProduct } from "./context";
import { useInventoryForm } from "./form-context";

export function CategorySubComponentsSection() {
    const context = useProduct();
    const { inventoryId, subComponentsArray } = context;
    const form = useInventoryForm();
    const nav = useInventoryTrpc({
        enableCategoryList: true,
        productKind: "component",
    });
    const trpc = useTRPC();
    const updateStatus = useMutation(
        trpc.inventories.updateSubComponentStatus.mutationOptions({
            onSuccess(data, variables, context) {},
        }),
    );
    const remove = useMutation(
        trpc.inventories.deleteSubComponent.mutationOptions({
            onSuccess(data, variables, context) {},
        }),
    );
    const categoryOptions = useMemo(
        () => selectOptions(nav.categoryList, "title", "id"),
        [nav.categoryList],
    );
    const tableRows = useMemo<InventoryProductFormSubComponentRow[]>(
        () =>
            subComponentsArray.fields.map((field, index) => ({
                ...field,
                fieldId: String(field._id || field.id || `sub-component-${index}`),
                index,
                parentId: field.parentId ?? inventoryId,
            })),
        [inventoryId, subComponentsArray.fields],
    );
    const handleUpdateStatus = (row: InventoryProductFormSubComponentRow) => {
        if (!row.id) return;
        updateStatus.mutate({
            id: row.id,
            status: row.status === "published" ? "draft" : "published",
        });
    };
    const removeItem = (row: InventoryProductFormSubComponentRow) => {
        if (row.id)
            remove.mutate(
                {
                    id: row.id,
                },
                {
                    onSuccess(data, variables, context) {
                        subComponentsArray.remove(row.index);
                    },
                },
            );
        else subComponentsArray.remove(row.index);
    };
    const handleCategorySelect = (
        row: InventoryProductFormSubComponentRow,
        selected: { data?: { id?: number | string | null } },
        cb: () => void,
    ) => {
        const f = subComponentsArray.fields[row.index];
        if (!f) return;
        const inventoryCategoryId = Number(selected.data?.id);
        if (!Number.isFinite(inventoryCategoryId)) return;
        const __data = {
            id: f.id,
            defaultInventoryId:
                inventoryCategoryId !== f.inventoryCategoryId ? null : undefined,
            index: row.index,
            parentId: inventoryId,
            status: f.status || "published",
            inventoryCategoryId,
        };
        nav.mutSubComponent.mutate(__data, {
            onSuccess(data, variables, context) {
                subComponentsArray.update(row.index, {
                    ...f,
                    ...__data,
                });
                cb();
            },
        });
    };
    const Render = {
        Content: (
            <div className="grid gap-4">
                <div className="flex">
                    <div>
                        <div className="w-5/6 text-sm text-muted-foreground">
                            Configure the step-by-step components customers will
                            see when building a complete
                            <span className="font-bold uppercase">{` ${form.getValues("product.name")} `}</span>
                            door. Drag to reorder, toggle status, and optionally
                            set default products for each category.
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
                <InventoryProductFormSubComponentsTable
                    data={tableRows}
                    control={form.control}
                    categoryOptions={categoryOptions}
                    parentInventoryId={inventoryId}
                    onCategorySelect={handleCategorySelect}
                    onToggleStatus={handleUpdateStatus}
                    onRemove={removeItem}
                />
            </div>
        ),
        Emtpy: (
            <Card className="p-8">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                        <Icons.Save className="h-8 w-8 text-blue-500" />
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
                        <Icons.Package className="h-4 w-4" />
                        <span>Variants will be available after saving</span>
                    </div>
                </div>
            </Card>
        ),
    };
    return (
        <AccordionItem value="subComponents">
            <AccordionTrigger className="flex">
                <div className="flex gap-4  flex-1 items-center">
                    <Icons.Package className="size-4" />
                    <span>Door Builder Components</span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="">
                {inventoryId ? Render.Content : Render.Emtpy}
            </AccordionContent>
        </AccordionItem>
    );
}
