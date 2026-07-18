"use client";

import ConfirmBtn from "@/components/_v1/confirm-btn";
import { AnimatedNumber } from "@/components/animated-number";
import { ShelfItemCategoryInput } from "@/components/forms/sales-form/shelf-item-category-input";
import { ShelfPriceCell } from "@/components/forms/sales-form/shelf-price-cell";
import { ShelfQtyInput } from "@/components/forms/sales-form/shelf-qty-input";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useShelf } from "@/hooks/use-shelf";
import {
	ShelfItemContext,
	useShelfItem,
	useShelfItemContext,
} from "@/hooks/use-shelf-item";
import { Button } from "@gnd/ui/button";
import {
	Combobox,
	ComboboxAnchor,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxTrigger,
} from "@gnd/ui/combobox";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";
import React, { useDeferredValue, useEffect, useState } from "react";

export type SalesFormShelfItemRowKind = "product" | "add-product";

export type SalesFormShelfItemRow = {
	id: string;
	shelfUid: string;
	prodUid: string | null;
	sectionIndex: number;
	productIndex: number;
	isFirstSectionRow: boolean;
	kind: SalesFormShelfItemRowKind;
};

type Column = ColumnDef<SalesFormShelfItemRow>;

function ShelfLineProvider({
	children,
	row,
}: {
	children: ReactNode;
	row: SalesFormShelfItemRow;
}) {
	const ctx = useShelfItemContext({ shelfUid: row.shelfUid });

	return (
		<ShelfItemContext.Provider value={ctx}>
			{children}
		</ShelfItemContext.Provider>
	);
}

export function getSalesFormShelfItemRowId(row: SalesFormShelfItemRow) {
	return row.id;
}

const serialColumn: Column = {
	id: "sn",
	header: "#",
	...sizes.custom(42, 56, 46),
	enableResizing: true,
	enableHiding: false,
	meta: {
		skeleton: { type: "text", width: "w-8" },
		headerLabel: "Section line",
		className: sizeClass(sizes.custom(42, 56, 46), "justify-center"),
		contentClassName: "text-center font-mono text-xs text-muted-foreground",
	},
	cell: ({ row }) =>
		row.original.kind === "add-product"
			? ""
			: `${row.original.sectionIndex + 1}.${row.original.productIndex + 1}`,
};

const categoryColumn: Column = {
	id: "category",
	header: "Category",
	...sizes.custom(210, 360, 260),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Category",
		className: sizeClass(
			sizes.custom(210, 360, 260),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "overflow-visible",
	},
	cell: ({ row }) => {
		if (!row.original.isFirstSectionRow) return null;

		return (
			<ShelfLineProvider row={row.original}>
				<ShelfItemCategoryInput />
			</ShelfLineProvider>
		);
	},
};

const productColumn: Column = {
	id: "product",
	header: "Product",
	...sizes.custom(240, 420, 300),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Product",
		className: sizeClass(sizes.custom(240, 420, 300)),
		contentClassName: "overflow-visible",
	},
	cell: ({ row }) => (
		<ShelfLineProvider row={row.original}>
			{row.original.kind === "add-product" ? (
				<AddProductCell />
			) : (
				<ProductPickerCell prodUid={row.original.prodUid} />
			)}
		</ShelfLineProvider>
	),
};

const priceColumn: Column = {
	id: "price",
	header: "Price",
	...sizes.custom(92, 132, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Price",
		className: sizeClass(sizes.custom(92, 132, 104)),
		contentClassName: "flex justify-end overflow-visible",
	},
	cell: ({ row }) => {
		if (row.original.kind !== "product" || !row.original.prodUid) return null;

		return (
			<ShelfLineProvider row={row.original}>
				<PriceCell prodUid={row.original.prodUid} />
			</ShelfLineProvider>
		);
	},
};

const qtyColumn: Column = {
	id: "qty",
	header: "Qty",
	...sizes.custom(82, 112, 92),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-14" },
		headerLabel: "Quantity",
		className: sizeClass(sizes.custom(82, 112, 92), "justify-center"),
		contentClassName: "flex justify-center overflow-visible",
	},
	cell: ({ row }) => {
		if (row.original.kind !== "product" || !row.original.prodUid) return null;

		return (
			<ShelfLineProvider row={row.original}>
				<QtyCell prodUid={row.original.prodUid} />
			</ShelfLineProvider>
		);
	},
};

const totalColumn: Column = {
	id: "total",
	header: "Total",
	...sizes.custom(92, 132, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Total",
		className: sizeClass(sizes.custom(92, 132, 104)),
		contentClassName: "text-right text-xs font-semibold tabular-nums",
	},
	cell: ({ row }) => {
		if (row.original.kind !== "product" || !row.original.prodUid) return null;

		return (
			<ShelfLineProvider row={row.original}>
				<TotalCell prodUid={row.original.prodUid} />
			</ShelfLineProvider>
		);
	},
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(52, 68, 56),
	enableResizing: true,
	enableHiding: false,
	meta: {
		skeleton: { type: "button", width: "w-8" },
		headerLabel: "Actions",
		className: sizeClass(sizes.custom(52, 68, 56), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row }) => {
		if (row.original.kind !== "product" || !row.original.prodUid) return null;

		return (
			<ShelfLineProvider row={row.original}>
				<DeleteProductCell prodUid={row.original.prodUid} />
			</ShelfLineProvider>
		);
	},
};

function AddProductCell() {
	const ctx = useShelfItem();

	return (
		<Button
			onClick={() => {
				ctx.addProduct();
			}}
			size="xs"
			variant="outline"
		>
			<Icons.add className="size-4" />
			Add Product
		</Button>
	);
}

function ProductPickerCell({ prodUid }: { prodUid: string | null }) {
	const itemCtx = useShelfItem();
	const shelf = useShelf();
	const { productsList: products } = itemCtx;
	const product = prodUid ? itemCtx.products?.[prodUid] : undefined;
	const { salesPrice, qty, customPrice } = product || {};
	const { costCls, itemUid } = shelf;
	const [open, onOpenChange] = useState(false);
	const [inputValue, setInputValue] = React.useState(product?.title || "");
	const deferredInputValue = useDeferredValue(inputValue);
	const [isTyping, setIsTyping] = useState(false);
	const [content, setContent] = React.useState<React.ComponentRef<
		typeof ComboboxContent
	> | null>(null);

	useEffect(() => {
		if (!prodUid) return;
		const effectiveSalesPrice = Number.isInteger(customPrice)
			? customPrice
			: salesPrice || 0;
		const totalPrice = (qty || 0) * effectiveSalesPrice;
		void totalPrice;
		costCls.updateShelfCosts(itemUid);
	}, [costCls, customPrice, itemUid, prodUid, qty, salesPrice]);

	const filteredProducts = React.useMemo(() => {
		const productList = products?.products ?? [];
		if (!deferredInputValue || !isTyping) return productList;

		const normalized = deferredInputValue.toLowerCase();
		return productList.filter((item) =>
			item.title.toLowerCase().includes(normalized),
		);
	}, [deferredInputValue, products, isTyping]);

	const onInputValueChange = React.useCallback(
		(value: string) => {
			setInputValue(value);
			if (content) {
				(content as HTMLDivElement).scrollTop = 0;
			}
		},
		[content],
	);

	if (!prodUid) return null;

	return (
		<Combobox
			open={open}
			onOpenChange={onOpenChange}
			value={product?.productId ? String(product.productId) : ""}
			onValueChange={(value) => {
				itemCtx.productChanged(prodUid, value);
				setTimeout(() => {
					if (value) onOpenChange(false);
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
					className="h-auto min-w-20 flex-1"
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
				{product?.productId ? (
					<ComboboxTrigger
						onClick={(event) => {
							event.preventDefault();
							setInputValue("");
							itemCtx.clearProduct(prodUid);
						}}
						className="absolute right-2 top-3"
					>
						<Icons.X className="h-4 w-4" />
					</ComboboxTrigger>
				) : null}
			</ComboboxAnchor>

			<ComboboxContent
				ref={(node) => setContent(node as HTMLDivElement | null)}
				className="relative max-h-[300px] overflow-y-auto overflow-x-hidden"
			>
				<ComboboxEmpty>No product found</ComboboxEmpty>
				{filteredProducts?.map((item) => (
					<ComboboxItem key={String(item.id)} value={String(item.id)} outset>
						{item.title}
					</ComboboxItem>
				))}
			</ComboboxContent>
		</Combobox>
	);
}

function PriceCell({ prodUid }: { prodUid: string }) {
	const itemCtx = useShelfItem();
	const product = itemCtx.products?.[prodUid];

	return <ShelfPriceCell prodUid={prodUid} product={product} />;
}

function QtyCell({ prodUid }: { prodUid: string }) {
	const itemCtx = useShelfItem();
	const product = itemCtx.products?.[prodUid];

	return <ShelfQtyInput prodUid={prodUid} value={product?.qty} />;
}

function TotalCell({ prodUid }: { prodUid: string }) {
	const itemCtx = useShelfItem();
	const product = itemCtx.products?.[prodUid];

	return <AnimatedNumber value={product?.totalPrice || 0} />;
}

function DeleteProductCell({ prodUid }: { prodUid: string }) {
	const itemCtx = useShelfItem();

	return (
		<ConfirmBtn
			trash
			onClick={() => {
				itemCtx.deleteProductLine(prodUid);
			}}
		/>
	);
}

export const columns: Column[] = [
	serialColumn,
	categoryColumn,
	productColumn,
	priceColumn,
	qtyColumn,
	totalColumn,
	actionsColumn,
];
