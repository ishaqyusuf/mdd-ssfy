"use client";

import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { AnimatedNumber } from "@/components/animated-number";
import Button from "@/components/common/button";
import {
	type SalesFormShelfItemRow,
	DataTable as SalesFormShelfItemsTable,
} from "@/components/tables-2/sales-form-shelf-items/data-table";
import { ShelfContext, useShelf, useShelfContext } from "@/hooks/use-shelf";
import {
	ShelfItemContext,
	useShelfItem,
	useShelfItemContext,
} from "@/hooks/use-shelf-item";
import { Icons } from "@gnd/ui/icons";
import React, { useDeferredValue, useEffect, useState } from "react";

import {
	Combobox,
	ComboboxAnchor,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxTrigger,
} from "@gnd/ui/combobox";

import { ShelfItemCategoryInput } from "./shelf-item-category-input";
import { ShelfPriceCell } from "./shelf-price-cell";
import { ShelfQtyInput } from "./shelf-qty-input";

export function ShelfItems({ itemStepUid }) {
	const ctx = useShelfContext(itemStepUid);
	const zus = useFormDataStore();
	const shelfLines = zus?.kvFormItem?.[ctx.itemUid]?.shelfItems?.lines || {};
	const shelfRows = buildShelfRows(ctx.shelfItemUids || [], shelfLines);

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
							mode="mobile"
						/>
					))}
				</div>
				<div className="hidden lg:block">
					<SalesFormShelfItemsTable data={shelfRows} />
				</div>
				<div className="w-full border-t  p-4">
					<Button
						onClick={() => {
							ctx.newSection();
						}}
						className=""
						size="xs"
					>
						<Icons.add className="size-4" />
						Item Section
					</Button>
				</div>
			</div>
		</ShelfContext.Provider>
	);
}

function buildShelfRows(
	shelfItemUids: string[],
	shelfLines: Record<string, { productUids?: string[] }>,
): SalesFormShelfItemRow[] {
	return shelfItemUids.flatMap((shelfUid, sectionIndex) => {
		const productUids = shelfLines?.[shelfUid]?.productUids || [];
		const productRows: SalesFormShelfItemRow[] = productUids.map(
			(prodUid, productIndex) => ({
				id: `${shelfUid}:${prodUid}`,
				shelfUid,
				prodUid,
				sectionIndex,
				productIndex,
				isFirstSectionRow: productIndex === 0,
				kind: "product",
			}),
		);

		return [
			...productRows,
			{
				id: `${shelfUid}:add-product`,
				shelfUid,
				prodUid: null,
				sectionIndex,
				productIndex: productUids.length,
				isFirstSectionRow: productUids.length === 0,
				kind: "add-product",
			} satisfies SalesFormShelfItemRow,
		];
	});
}
function ShelfItemLine({
	shelfUid,
	index,
	mode = "desktop",
}: {
	shelfUid;
	index;
	mode?: "desktop" | "mobile";
}) {
	const ctx = useShelfItemContext({ shelfUid });

	if (mode === "mobile") {
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
							{ctx.productUids?.map((puid) => (
								<ShelfItemProduct
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
								<Icons.add className="size-4" />
								Add Product
							</Button>
						</div>
					</div>
				</div>
			</ShelfItemContext.Provider>
		);
	}

	return null;
}
function ShelfItemProduct({
	prodUid,
	mode = "desktop",
}: {
	prodUid;
	mode?: "desktop" | "mobile";
}) {
	const itemCtx = useShelfItem();
	const shelf = useShelf();
	const { productsList: products } = itemCtx;
	const product = itemCtx.products?.[prodUid];
	const { salesPrice, qty, customPrice } = product || {};
	const { costCls, itemUid } = shelf;
	useEffect(() => {
		const effectiveSalesPrice = Number.isInteger(customPrice)
			? customPrice
			: salesPrice || 0;
		const totalPrice = (qty || 0) * effectiveSalesPrice;
		void totalPrice;
		// itemCtx.dotUpdateProduct(prodUid, "totalPrice", totalPrice);
		costCls.updateShelfCosts(itemUid);
	}, [costCls, customPrice, itemUid, qty, salesPrice]);
	const [open, onOpenChange] = useState(false);
	const [inputValue, setInputValue] = React.useState(product?.title || "");
	const deferredInputValue = useDeferredValue(inputValue);
	const [isTyping, setIsTyping] = useState(false);
	const filteredProducts = React.useMemo(() => {
		if (!deferredInputValue || !isTyping) return products?.products;
		const normalized = deferredInputValue.toLowerCase();
		const __products = products?.products?.filter((item) =>
			item.title.toLowerCase().includes(normalized),
		);
		return __products;
	}, [deferredInputValue, products, isTyping]);
	const [content, setContent] = React.useState<React.ComponentRef<
		typeof ComboboxContent
	> | null>(null);
	const onInputValueChange = React.useCallback(
		(value: string) => {
			setInputValue(value);
			if (content) {
				(content as HTMLDivElement).scrollTop = 0; // Reset scroll position
				//  virtualizer.measure();
			}
		},
		[content],
	);

	if (mode === "mobile") {
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
							<ComboboxAnchor className="relative h-full min-h-10 flex-wrap px-3 py-2">
								<ComboboxInput
									className="h-auto min-w-20 flex-1 "
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
							</ComboboxAnchor>

							<ComboboxContent
								ref={(node) => setContent(node as HTMLDivElement | null)}
								className="relative max-h-[300px] overflow-y-auto overflow-x-hidden"
							>
								<ComboboxEmpty>No product found</ComboboxEmpty>
								{filteredProducts?.map((trick) => (
									<ComboboxItem
										key={String(trick.id)}
										value={String(trick.id)}
										outset
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
							<div className="text-xs uppercase text-muted-foreground">Qty</div>
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

	return null;
}
