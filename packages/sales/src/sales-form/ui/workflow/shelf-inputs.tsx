/** @jsxImportSource react */
"use client";

import { useEffect, useMemo, useState } from "react";

import {
	Combobox,
	ComboboxAnchor,
	ComboboxBadgeItem,
	ComboboxBadgeList,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxTrigger,
} from "@gnd/ui/combobox";
import { Icons } from "@gnd/ui/icons";
import {
	buildShelfProductsById,
	getShelfChildCategories,
	getShelfLeafCategoryIds,
	getShelfRowBasePrice,
	getShelfRowDisplayTotal,
	getShelfRowDisplayUnitPrice,
	getShelfRowSalesPrice,
	type ShelfCategoryLike as ShelfCategory,
	type ShelfProductLike as ShelfProduct,
} from "./shelf-helpers";

export {
	buildShelfProductsById,
	getShelfChildCategories,
	getShelfLeafCategoryIds,
	getShelfRowBasePrice,
	getShelfRowDisplayTotal,
	getShelfRowDisplayUnitPrice,
	getShelfRowSalesPrice,
} from "./shelf-helpers";

export function ShelfCategoryPathInput(props: {
	categories: ShelfCategory[];
	categoryIds: number[];
	onChange: (ids: number[]) => void;
	onClearRequest?: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const selectedIds = Array.isArray(props.categoryIds) ? props.categoryIds : [];
	const lastSelectedId = selectedIds.length
		? selectedIds[selectedIds.length - 1]
		: null;
	const options = useMemo(
		() => getShelfChildCategories(props.categories, lastSelectedId),
		[props.categories, lastSelectedId],
	);
	const filteredOptions = useMemo(() => {
		const normalized = inputValue.trim().toLowerCase();
		if (!normalized) return options;
		return options.filter((option) =>
			String(option?.name || "")
				.toLowerCase()
				.includes(normalized),
		);
	}, [inputValue, options]);

	return (
		<Combobox
			open={open}
			onOpenChange={setOpen}
			value={selectedIds.map(String)}
			onValueChange={(value) => {
				const nextIds = Array.isArray(value)
					? value
							.map((entry) => Number(entry || 0))
							.filter((entry) => entry > 0)
					: [];
				props.onChange(nextIds);
				setInputValue("");
			}}
			multiple
			inputValue={inputValue}
			onInputValueChange={setInputValue}
			manualFiltering
			className="w-full"
			autoHighlight
		>
			<ComboboxAnchor className="relative min-h-10 flex-wrap px-3 py-2">
				<ComboboxBadgeList>
					{selectedIds.map((item, index) => {
						const option = props.categories.find(
							(category) => Number(category?.id || 0) === Number(item || 0),
						);
						if (!option) return null;
						return (
							<ComboboxBadgeItem
								key={`shelf-cat-badge-${item}`}
								value={String(item)}
								noDelete={!(selectedIds.length - 1 === index)}
								onDelete={(e) => {
									e.preventDefault();
									props.onChange(selectedIds.slice(0, index));
								}}
							>
								{option.name}
							</ComboboxBadgeItem>
						);
					})}
					{selectedIds.length > 1 ? (
						<ComboboxBadgeItem
							value="clear"
							onDelete={(e) => {
								e.preventDefault();
								if (props.onClearRequest) {
									props.onClearRequest();
									return;
								}
								props.onChange([]);
								setInputValue("");
							}}
						>
							Clear
						</ComboboxBadgeItem>
					) : null}
				</ComboboxBadgeList>
				{options.length ? (
					<>
						<ComboboxInput
							className="h-auto min-w-20 flex-1"
							placeholder="Select category..."
							onFocus={() => setOpen(true)}
						/>
						<ComboboxTrigger className="absolute right-2 top-3">
							<Icons.ChevronDown className="h-4 w-4" />
						</ComboboxTrigger>
					</>
				) : null}
			</ComboboxAnchor>
			{options.length ? (
				<ComboboxContent className="relative max-h-[280px] overflow-y-auto overflow-x-hidden">
					<ComboboxEmpty>No category found</ComboboxEmpty>
					{filteredOptions.map((option) => (
						<ComboboxItem
							key={`shelf-cat-option-${option.id}`}
							value={String(option.id)}
							outset
						>
							{option.name}
						</ComboboxItem>
					))}
				</ComboboxContent>
			) : null}
		</Combobox>
	);
}

export function ShelfProductCombobox(props: {
	products: ShelfProduct[];
	value?: number | null;
	onChange: (productId: number | null) => void;
	disabled?: boolean;
	onClearRequest?: () => void;
	formatMoney: (value?: number | null) => string;
}) {
	const [open, setOpen] = useState(false);
	const selectedProduct = props.products.find(
		(product) => Number(product?.id || 0) === Number(props.value || 0),
	);
	const [inputValue, setInputValue] = useState(selectedProduct?.title || "");

	useEffect(() => {
		setInputValue(selectedProduct?.title || "");
	}, [selectedProduct?.title]);

	const filteredProducts = useMemo(() => {
		const normalized = inputValue.trim().toLowerCase();
		if (!normalized) return props.products;
		return props.products.filter((product) =>
			String(product?.title || "")
				.toLowerCase()
				.includes(normalized),
		);
	}, [inputValue, props.products]);

	return (
		<Combobox
			open={open}
			onOpenChange={setOpen}
			value={props.value ? String(props.value) : ""}
			onValueChange={(next) => {
				const nextId = Number(next || 0) || null;
				props.onChange(nextId);
				setTimeout(() => {
					if (nextId) setOpen(false);
				}, 100);
			}}
			inputValue={inputValue}
			onInputValueChange={setInputValue}
			manualFiltering
			className="w-full"
			autoHighlight
			disabled={props.disabled}
		>
			<ComboboxAnchor className="relative h-full min-h-10 flex-wrap px-3 py-2">
				<ComboboxInput
					className="h-auto min-w-20 flex-1"
					placeholder="Select product..."
					onFocus={() => setOpen(true)}
				/>
				{props.value ? (
					<ComboboxTrigger
						onClick={(e) => {
							e.preventDefault();
							if (props.onClearRequest) {
								props.onClearRequest();
								setOpen(true);
								return;
							}
							setInputValue("");
							props.onChange(null);
							setOpen(true);
						}}
						className="absolute right-2 top-3"
					>
						<Icons.X className="h-4 w-4" />
					</ComboboxTrigger>
				) : (
					<ComboboxTrigger className="absolute right-2 top-3">
						<Icons.ChevronDown className="h-4 w-4" />
					</ComboboxTrigger>
				)}
			</ComboboxAnchor>
			<ComboboxContent className="relative max-h-[300px] overflow-y-auto overflow-x-hidden">
				<ComboboxEmpty>No product found</ComboboxEmpty>
				{filteredProducts.map((product) => (
					<ComboboxItem
						key={`shelf-product-option-${product.id}`}
						value={String(product.id)}
						outset
					>
						<div className="flex w-full items-center gap-3">
							{product?.img ? (
								<img
									src={String(product.img)}
									alt={String(product?.title || "Product")}
									className="size-8 rounded-md border border-slate-200 object-cover"
								/>
							) : (
								<div className="flex size-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
									<Icons.Package2 className="size-4" />
								</div>
							)}
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-slate-900">
									{product.title}
								</p>
								<p className="text-[11px] text-muted-foreground">
									{props.formatMoney(Number(product?.unitPrice || 0))}
								</p>
							</div>
						</div>
					</ComboboxItem>
				))}
			</ComboboxContent>
		</Combobox>
	);
}
