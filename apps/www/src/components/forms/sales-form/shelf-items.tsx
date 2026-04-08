"use client";

import React, { useDeferredValue, useEffect, useState } from "react";
import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import { AnimatedNumber } from "@/components/animated-number";
import Button from "@/components/common/button";
import { ShelfContext, useShelf, useShelfContext } from "@/hooks/use-shelf";
import {
    ShelfItemContext,
    useShelfItem,
    useShelfItemContext,
} from "@/hooks/use-shelf-item";
import { _useAsync } from "@/lib/use-async";

import {
    Combobox,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxTrigger,
    useComboboxAnchor,
} from "@gnd/ui/combobox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { ClearCategoryModal } from "./clear-category";
import { ShelfItemCategoryInput } from "./shelf-item-category-input";
import { ShelfPriceCell } from "./shelf-price-cell";
import { ShelfQtyInput } from "./shelf-qty-input";

export function ShelfItems({ itemStepUid }) {
    const ctx = useShelfContext(itemStepUid);
    return (
        <ShelfContext.Provider value={ctx}>
            {/*  */}
            <div className="">
                <div className="space-y-4 lg:hidden">
                    {ctx.shelfItemUids?.map((uid, index) => (
                        <ShelfItemLine
                            index={index}
                            key={`mobile-${uid}`}
                            shelfUid={uid}
                            isLast={ctx.shelfItemUids?.length - 1 == index}
                            mode="mobile"
                        />
                    ))}
                </div>
                <div className="hidden lg:block">
                    <Table className="size-sm">
                        <TableBody>
                            {ctx.shelfItemUids?.map((uid, index) => (
                                <ShelfItemLine
                                    index={index}
                                    key={uid}
                                    shelfUid={uid}
                                    isLast={ctx.shelfItemUids?.length - 1 == index}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className="w-full border-t  p-4">
                    <Button
                        onClick={() => {
                            ctx.newSection();
                        }}
                        className=""
                        size="xs"
                    >
                        <Icons.Add className="size-4" />
                        Item Section
                    </Button>
                </div>
            </div>
        </ShelfContext.Provider>
    );
}
export function ShelfItemLine({
    shelfUid,
    index,
    isLast,
    mode = "desktop",
}: {
    shelfUid;
    index;
    isLast;
    mode?: "desktop" | "mobile";
}) {
    const zus = useFormDataStore();
    const { itemUid, categories } = useShelf();
    const ctx = useShelfItemContext({ shelfUid });
    const { categoryIds, setCategoryIds, filteredTricks, inputValue } = ctx;
    // const [categoryIds, setCategoryIds] = React.useState<string[]>([]);
    const [open, onOpenChange] = useState(false);
    const [openClearCat, setOpenClearCat] = useState(false);

    if (mode == "mobile") {
        return (
            <ShelfItemContext.Provider value={ctx}>
                <div className="rounded-xl border bg-background p-4 shadow-sm">
                    <div className="space-y-3">
                        <div>
                            <div className="text-xs uppercase text-muted-foreground">
                                Item Section #{index + 1}
                            </div>
                            <div className="mt-1">
                                <ShelfItemCategoryInput />
                            </div>
                        </div>
                        <div className="space-y-3">
                            {ctx.productUids?.map((puid, puidIndex) => (
                                <ShelfItemProduct
                                    isLast={
                                        isLast &&
                                        ctx.productUids?.length - 1 == puidIndex
                                    }
                                    prodUid={puid}
                                    key={`mobile-${puid}`}
                                    mode="mobile"
                                />
                            ))}
                            <Button
                                onClick={() => {
                                    ctx.addProduct();
                                }}
                                className="w-full"
                            >
                                <Icons.Add className="size-4" />
                                Add Product
                            </Button>
                        </div>
                    </div>
                </div>
            </ShelfItemContext.Provider>
        );
    }

    return (
        <ShelfItemContext.Provider value={ctx}>
            <TableRow className="hover:bg-transparent">
                <TableCell className="flex flex-col">
                    <Table>
                        {index > 0 || (
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                </TableRow>
                            </TableHeader>
                        )}
                        <TableBody>
                            <TableRow>
                                <TableCell>
                                    <ShelfItemCategoryInput />
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableCell>
                <TableCell className="w-[70%] p-0">
                    <div className="flex flex-col">
                        <Table className="">
                            {index > 0 || (
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead align="right">
                                            Total
                                        </TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                            )}
                            <TableBody>
                                {ctx.productUids?.map((puid, puidIndex) => (
                                    <ShelfItemProduct
                                        isLast={
                                            isLast &&
                                            ctx.productUids?.length - 1 ==
                                                puidIndex
                                        }
                                        prodUid={puid}
                                        key={puid}
                                    />
                                ))}
                                <TableRow>
                                    <TableCell>
                                        <div className="flex justify-end">
                                            <Button
                                                onClick={() => {
                                                    ctx.addProduct();
                                                }}
                                            >
                                                <Icons.Add className="size-4" />
                                                Add Product
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </TableCell>
            </TableRow>
        </ShelfItemContext.Provider>
    );
}
function ShelfItemProduct({
    prodUid,
    isLast,
    mode = "desktop",
}: {
    prodUid;
    isLast;
    mode?: "desktop" | "mobile";
}) {
    const itemCtx = useShelfItem();
    const shelf = useShelf();
    const { productsList: products } = itemCtx;
    const product = itemCtx.products?.[prodUid];
    const { basePrice, salesPrice, qty, customPrice } = product || {};
    useEffect(() => {
        let _salesPrice = Number.isInteger(customPrice)
            ? customPrice
            : salesPrice || 0;
        let totalPrice = qty * _salesPrice;
        // itemCtx.dotUpdateProduct(prodUid, "totalPrice", totalPrice);
        shelf.costCls.updateShelfCosts(shelf.itemUid);
    }, [basePrice, qty, customPrice, prodUid]);
    const [open, onOpenChange] = useState(false);
    const [inputValue, setInputValue] = React.useState(product?.title || "");
    const deferredInputValue = useDeferredValue(inputValue);
    const [isTyping, setIsTyping] = useState(false);
    const filteredProducts = React.useMemo(() => {
        if (!deferredInputValue || !isTyping) return products?.products;
        const normalized = deferredInputValue.toLowerCase();
        const __products = products?.products?.filter((item) =>
            item.title.toLowerCase().includes(normalized)
        );
        return __products;
    }, [deferredInputValue, products, isTyping]);
    const [content, setContent] = React.useState<React.ComponentRef<
        typeof ComboboxContent
    > | null>(null);
    const anchor = useComboboxAnchor();
    const onInputValueChange = React.useCallback(
        (value: string) => {
            setInputValue(value);
            if (content) {
                (content as any).scrollTop = 0; // Reset scroll position
                //  virtualizer.measure();
            }
        },
        [content]
    );

    if (mode == "mobile") {
        return (
            <div className="rounded-lg border bg-muted/20 p-3">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <div className="text-xs uppercase text-muted-foreground">
                            Product
                        </div>
                        <Combobox
                            open={open}
                            onOpenChange={onOpenChange}
                            value={String(product?.productId)}
                            onValueChange={(e) => {
                                itemCtx.productChanged(prodUid, e);
                                setTimeout(() => {
                                    if (e) onOpenChange(false);
                                }, 100);
                            }}
                            inputValue={inputValue}
                            onInputValueChange={onInputValueChange}
                            manualFiltering
                            className="w-full"
                            autoHighlight
                        >
                            <ComboboxChips
                                ref={anchor}
                                className="relative h-full min-h-10 flex-wrap px-3 py-2"
                            >
                                <ComboboxChipsInput
                                    className="min-w-20 flex-1 "
                                    onFocus={() => {
                                        onOpenChange(true);
                                        setIsTyping(false);
                                    }}
                                    onBlur={() => {
                                        setIsTyping(false);
                                    }}
                                    onKeyDown={() => {
                                        setIsTyping(true);
                                    }}
                                    placeholder="Select product..."
                                />
                                {!product?.productId || (
                                    <ComboboxTrigger
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setInputValue("");
                                            itemCtx.clearProduct(prodUid);
                                        }}
                                        className="absolute right-2 top-3"
                                    >
                                        <Icons.X className="h-4 w-4" />
                                    </ComboboxTrigger>
                                )}
                            </ComboboxChips>

                            <ComboboxContent
                                anchor={anchor}
                                ref={(node) => setContent(node as any)}
                                className="relative max-h-[300px] overflow-y-auto overflow-x-hidden"
                            >
                                <ComboboxEmpty>No product found</ComboboxEmpty>
                                {filteredProducts?.map((trick) => (
                                    <ComboboxItem
                                        key={String(trick.id)}
                                        value={String(trick.id)}
                                    >
                                        {trick.title}
                                    </ComboboxItem>
                                ))}
                            </ComboboxContent>
                        </Combobox>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                            <div className="text-xs uppercase text-muted-foreground">
                                Price
                            </div>
                            <ShelfPriceCell prodUid={prodUid} product={product} />
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs uppercase text-muted-foreground">
                                Qty
                            </div>
                            <ShelfQtyInput prodUid={prodUid} value={product?.qty} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-xs uppercase text-muted-foreground">
                                Total
                            </div>
                            <div className="text-base font-semibold">
                                <AnimatedNumber value={product?.totalPrice || 0} />
                            </div>
                        </div>
                        <ConfirmBtn
                            trash
                            onClick={() => {
                                itemCtx.deleteProductLine(prodUid);
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <TableRow className="w-2/3 hover:bg-transparent">
            <TableCell>
                <Combobox
                    open={open}
                    onOpenChange={onOpenChange}
                    value={String(product?.productId)}
                    onValueChange={(e) => {
                        itemCtx.productChanged(prodUid, e);
                        setTimeout(() => {
                            if (e) onOpenChange(false);
                        }, 100);
                    }}
                    inputValue={inputValue}
                    onInputValueChange={onInputValueChange}
                    manualFiltering
                    className="w-full"
                    autoHighlight
                >
                    <ComboboxChips
                        ref={anchor}
                        className="relative h-full min-h-10 flex-wrap px-3 py-2"
                    >
                        <ComboboxChipsInput
                            className="min-w-20 flex-1 "
                            onFocus={(e) => {
                                onOpenChange(true);
                                setIsTyping(false);
                            }}
                            onBlur={() => {
                                setIsTyping(false);
                            }}
                            onKeyDown={(e) => {
                                setIsTyping(true);
                            }}
                            placeholder="Select product..."
                        />
                        {!product?.productId || (
                            <ComboboxTrigger
                                onClick={(e) => {
                                    e.preventDefault();
                                    setInputValue("");
                                    itemCtx.clearProduct(prodUid);
                                }}
                                className="absolute right-2 top-3"
                            >
                                <Icons.X className="h-4 w-4" />
                            </ComboboxTrigger>
                        )}
                    </ComboboxChips>

                    <ComboboxContent
                        anchor={anchor}
                        ref={(node) => setContent(node as any)}
                        className="relative max-h-[300px] overflow-y-auto overflow-x-hidden"
                    >
                        <ComboboxEmpty>No product found</ComboboxEmpty>
                        {filteredProducts?.map((trick) => (
                            <ComboboxItem
                                key={String(trick.id)}
                                value={String(trick.id)}
                            >
                                {trick.title}
                            </ComboboxItem>
                        ))}
                    </ComboboxContent>
                </Combobox>
            </TableCell>
            <TableCell className="w-24">
                <ShelfPriceCell prodUid={prodUid} product={product} />
            </TableCell>
            <TableCell className="w-16">
                <ShelfQtyInput prodUid={prodUid} value={product?.qty} />
            </TableCell>
            <TableCell className="relative w-24">
                <AnimatedNumber value={product?.totalPrice || 0} />
                {/* {!isLast || <Footer />} */}
            </TableCell>
            <TableCell className="w-24">
                <ConfirmBtn
                    trash
                    onClick={() => {
                        itemCtx.deleteProductLine(prodUid);
                    }}
                />
            </TableCell>
        </TableRow>
    );
}
function Footer() {
    return (
        <div className="absolute">
            <AnimatedNumber value={100} />
        </div>
    );
}
