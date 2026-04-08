import { useState } from "react";
import { createShelfCategoryAction } from "@/actions/create-shelf-category";
import { useShelf } from "@/hooks/use-shelf";
import { useShelfItem } from "@/hooks/use-shelf-item";
import { useAction } from "next-safe-action/hooks";

import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxItem,
    ComboboxTrigger,
    useComboboxAnchor,
} from "@gnd/ui/combobox";
import { Icons } from "@gnd/ui/icons";
import { useToast } from "@gnd/ui/use-toast";

import { ClearCategoryModal } from "./clear-category";
import { InventoryShelfCategory } from "@/components/inventory-shelf-cateogory";

export function ShelfItemCategoryInput({}) {
    const ctx = useShelfItem();
    const { categoryIds, setCategoryIds, filteredTricks, inputValue } = ctx;
    // const [categoryIds, setCategoryIds] = React.useState<string[]>([]);
    const [open, onOpenChange] = useState(false);
    const anchor = useComboboxAnchor();

    const { itemUid, categories } = useShelf();
    function clearCategory(e) {
        e.preventDefault();
        const selection = Object.values(ctx.products)?.filter(
            (a) => a?.productId,
        )?.length;
        if (selection > 0) {
            setOpenClearCat(true);
        } else {
            ctx.dotUpdateShelf("categoryIds", []);
        }
    }
    const [openClearCat, setOpenClearCat] = useState(false);
    function _clearCats() {}
    const { toast } = useToast();
    const createCategory = useAction(createShelfCategoryAction, {
        onSuccess(args) {
            toast({
                title: "Category created",
                description: `Category "${args.input.name}" created`,
                variant: "default",
            });
        },
    });
    async function __createCategory(name) {
        const parentCategoryId = categoryIds?.[0];
        const categoryId = [...categoryIds].reverse()[0];
        createCategory.execute({
            name,
            parentCategoryId,
            categoryId,
        });
    }
    return (
        <>
            <ClearCategoryModal
                onClear={_clearCats}
                open={openClearCat}
                openChange={setOpenClearCat}
            />
            <Combobox
                open={open}
                onOpenChange={onOpenChange}
                value={categoryIds.map((id) => String(id))}
                onValueChange={setCategoryIds}
                multiple
                inputValue={inputValue}
                onInputValueChange={ctx.onInputValueChange}
                manualFiltering
                className="w-full"
                autoHighlight
            >
                <ComboboxChips
                    ref={anchor}
                    className="relative h-full min-h-10 flex-wrap px-3 py-2"
                >
                        {categoryIds.map((item, index) => {
                            const option = categories?.find(
                                (trick) => trick.id === Number(item),
                            );
                            if (!option) return null;

                            return (
                                <ComboboxChip
                                    noDelete={
                                        !(categoryIds?.length - 1 == index)
                                    }
                                    onDelete={(e) => {
                                        // e.preventDefault();
                                    }}
                                    key={item}
                                    value={String(item)}
                                >
                                    {option.name}
                                </ComboboxChip>
                            );
                        })}
                        {categoryIds?.length < 2 || (
                            <ComboboxChip
                                className=""
                                value="clear"
                                onDelete={clearCategory}
                            >
                                Clear
                            </ComboboxChip>
                        )}
                    {!ctx?.options?.length || (
                        <>
                            <ComboboxChipsInput
                                className="min-w-20 flex-1"
                                onFocus={(e) => {
                                    onOpenChange(true);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        const value = e.currentTarget.value;

                                        __createCategory(value);
                                    }
                                }}
                                placeholder="Select category..."
                            />
                            <ComboboxTrigger className="absolute right-2 top-3">
                                <Icons.ChevronDown className="h-4 w-4" />
                            </ComboboxTrigger>
                        </>
                    )}
                </ComboboxChips>
                {!ctx.options?.length || (
                    <ComboboxContent
                        anchor={anchor}
                        ref={(node) => ctx?.setContent(node as any)}
                        className="relative max-h-[300px] overflow-y-auto overflow-x-hidden"
                    >
                        {/* <ComboboxEmpty>
                                                        No category found
                                                    </ComboboxEmpty> */}
                        {!inputValue || (
                            <ComboboxItem
                                onClick={(e) => {
                                    e.preventDefault();
                                    __createCategory(inputValue);
                                }}
                                className=""
                                value="create"
                            >
                                Create {`"${inputValue}"`}
                            </ComboboxItem>
                        )}
                        {filteredTricks?.map((trick) => (
                            <ComboboxItem
                                key={String(trick.id)}
                                value={String(trick.id)}
                            >
                                {trick.name}
                            </ComboboxItem>
                        ))}
                    </ComboboxContent>
                )}
            </Combobox>
            <InventoryShelfCategory categoryId={Number(categoryIds?.[0])} />
        </>
    );
}
