/** @jsxImportSource react */
"use client";

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
import { ConfirmBtn } from "@gnd/ui/confirm-button";
import { Menu } from "@gnd/ui/custom/menu";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
	multiplyMoney,
	roundMoney,
} from "../../../payment-system/domain/money";
import {
	type CostPriceBreakdownContext,
	CostPriceBreakdownHover,
} from "./cost-price-breakdown-hover";
import { SalesFormQuantityStepper } from "./sales-form-quantity-stepper";
import {
	getShelfRowBasePrice,
	getShelfRowDisplayTotal,
	getShelfRowDisplayUnitPrice,
	getShelfRowSalesPrice,
} from "./shelf-inputs";
import {
	ShelfProductEditDialog,
	type ShelfProductEditInput,
} from "./shelf-product-edit-dialog";
import {
	buildShelfProductRowPatch,
	clearShelfRowProduct,
	patchShelfRowBasePrice,
	patchShelfRowCustomPrice,
	patchShelfRowPrice,
	patchShelfRowQty,
	updateShelfProductInSections,
} from "./shelf-row-products";
import {
	type ShelfCategoryRecord,
	type ShelfProductOption,
	type ShelfRowDraft,
	type ShelfSectionDraft,
	createShelfSectionDraft,
} from "./workflow-records";

type InlineRowEntry = {
	section: ShelfSectionDraft;
	sectionIndex: number;
	row: ShelfRowDraft;
	rowIndex: number;
};

export type ShelfInlineItemsEditorProps = {
	sections: ShelfSectionDraft[];
	categories: ShelfCategoryRecord[];
	products: ShelfProductOption[];
	profileCoefficient: number;
	canEditPricing?: boolean;
	priceBreakdown?: CostPriceBreakdownContext | null;
	formatMoney: (value?: number | null) => string | null;
	onSectionsChange: (sections: ShelfSectionDraft[]) => void;
	headerSlot?: ReactNode;
	onProductSearchChange?: (query: string) => void;
	isSearchingProducts?: boolean;
	onResolveProductDetails?: (
		product: ShelfProductOption,
	) => Promise<ShelfProductOption | null>;
	onUpdateProduct?: (
		input: ShelfProductEditInput,
	) => Promise<ShelfProductOption>;
};

function roundCurrency(value: unknown) {
	return roundMoney(Number(value || 0));
}

function sectionSubtotal(section: ShelfSectionDraft) {
	return roundCurrency(
		(section.rows || []).reduce(
			(sum, row) => sum + Number(getShelfRowDisplayTotal(row) || 0),
			0,
		),
	);
}

function uniquePositiveNumbers(values: Array<number | null | undefined>) {
	return values
		.map((value) => Number(value || 0))
		.filter((value, index, list) => value > 0 && list.indexOf(value) === index);
}

function categoryParentId(category?: ShelfCategoryRecord | null) {
	return (
		Number(category?.categoryId ?? category?.parentCategoryId ?? 0) || null
	);
}

function productCategoryPath(
	product: ShelfProductOption | null | undefined,
	categories: ShelfCategoryRecord[],
) {
	const apiPath = Array.isArray(product?.categoryPath)
		? product.categoryPath
				.map((entry) => Number(entry?.id || 0))
				.filter((id) => id > 0)
		: [];
	if (apiPath.length) return uniquePositiveNumbers(apiPath);
	const categoryId = Number(product?.categoryId || 0) || null;
	const productParentId = Number(product?.parentCategoryId || 0) || null;
	const category = categories.find(
		(entry) => Number(entry?.id || 0) === Number(categoryId || 0),
	);
	return uniquePositiveNumbers([
		productParentId,
		categoryParentId(category),
		categoryId,
	]);
}

function categoryBreadcrumb(
	categoryIds: number[],
	categories: ShelfCategoryRecord[],
) {
	return categoryIds
		.map((id) => {
			const category = categories.find(
				(entry) => Number(entry?.id || 0) === Number(id || 0),
			);
			return String(category?.name || "").trim();
		})
		.filter(Boolean)
		.join(" > ");
}

export function productBreadcrumb(
	product: ShelfProductOption | null | undefined,
	categories: ShelfCategoryRecord[],
) {
	const apiPath = Array.isArray(product?.categoryPath)
		? product.categoryPath
				.map((entry) => String(entry?.name || "").trim())
				.filter(Boolean)
		: [];
	if (apiPath.length) return apiPath.join(" > ");
	const namedPath = [
		String(product?.parentCategoryName || "").trim(),
		String(product?.categoryName || "").trim(),
	].filter(Boolean);
	if (namedPath.length) return namedPath.join(" > ");
	return categoryBreadcrumb(
		productCategoryPath(product, categories),
		categories,
	);
}

function rowCategoryIds(
	row: ShelfRowDraft,
	product?: ShelfProductOption | null,
) {
	const metaIds = Array.isArray(row?.meta?.categoryIds)
		? row.meta.categoryIds
		: [];
	return uniquePositiveNumbers([
		...metaIds,
		Number(row?.meta?.shelfParentCategoryId || 0),
		Number(product?.parentCategoryId || 0),
		Number(row?.categoryId || 0),
		Number(product?.categoryId || 0),
	]);
}

function replaceSectionRow(
	sections: ShelfSectionDraft[],
	entry: InlineRowEntry,
	nextRow: ShelfRowDraft,
) {
	return sections.map((section, sectionIndex) => {
		if (sectionIndex !== entry.sectionIndex) return section;
		const nextSection = {
			...section,
			rows: (section.rows || []).map((row, rowIndex) =>
				rowIndex === entry.rowIndex ? nextRow : row,
			),
		};
		return {
			...nextSection,
			subTotal: sectionSubtotal(nextSection),
		};
	});
}

function replaceRowAsOwnSection(
	sections: ShelfSectionDraft[],
	entry: InlineRowEntry,
	nextRow: ShelfRowDraft,
) {
	const categoryIds = Array.isArray(nextRow?.meta?.categoryIds)
		? nextRow.meta.categoryIds
		: [];
	const parentCategoryId =
		Number(nextRow?.meta?.shelfParentCategoryId || 0) ||
		(categoryIds.length ? categoryIds[0] : null) ||
		null;
	const categoryId =
		Number(nextRow?.categoryId || 0) ||
		(categoryIds.length ? categoryIds[categoryIds.length - 1] : null) ||
		null;
	const shouldSplit = Number(entry.section.rows?.length || 0) > 1;
	const sectionUid = shouldSplit
		? createShelfSectionDraft().uid
		: entry.section.uid;
	const ownRow = {
		...nextRow,
		meta: {
			...(nextRow?.meta || {}),
			sectionUid,
		},
	};
	const ownSection: ShelfSectionDraft = {
		...createShelfSectionDraft(),
		uid: sectionUid,
		categoryIds,
		parentCategoryId,
		categoryId,
		rows: [ownRow],
		subTotal: Number(getShelfRowDisplayTotal(ownRow) || 0),
	};

	return sections.flatMap((section, sectionIndex) => {
		if (sectionIndex !== entry.sectionIndex) return [section];
		const remainingRows = (section.rows || []).filter(
			(_row, rowIndex) => rowIndex !== entry.rowIndex,
		);
		if (!remainingRows.length) return [ownSection];
		const remainingSection = {
			...section,
			rows: remainingRows,
		};
		remainingSection.subTotal = sectionSubtotal(remainingSection);
		return [remainingSection, ownSection];
	});
}

function deleteSectionRow(
	sections: ShelfSectionDraft[],
	entry: InlineRowEntry,
) {
	return sections.flatMap((section, sectionIndex) => {
		if (sectionIndex !== entry.sectionIndex) return [section];
		const rows = (section.rows || []).filter(
			(_row, rowIndex) => rowIndex !== entry.rowIndex,
		);
		if (!rows.length) return [];
		const nextSection = { ...section, rows };
		nextSection.subTotal = sectionSubtotal(nextSection);
		return [nextSection];
	});
}

function ShelfInlineProductCell(props: {
	row: ShelfRowDraft;
	products: ShelfProductOption[];
	categories: ShelfCategoryRecord[];
	formatMoney: (value?: number | null) => string | null;
	onSelectProduct: (product: ShelfProductOption | null) => void;
	onProductSearchChange?: (query: string) => void;
	isSearchingProducts?: boolean;
	isLoadingProduct?: boolean;
	productLoadError?: string | null;
	onEditProduct?: (product: ShelfProductOption) => void;
}) {
	const [open, setOpen] = useState(false);
	const selectedProduct = props.products.find(
		(product) => Number(product?.id || 0) === Number(props.row?.productId || 0),
	);
	const [inputValue, setInputValue] = useState(
		selectedProduct?.title || props.row.description || "",
	);

	useEffect(() => {
		setInputValue(selectedProduct?.title || props.row.description || "");
	}, [selectedProduct?.title, props.row.description]);

	const categoryIds = rowCategoryIds(props.row, selectedProduct);
	const breadcrumb = selectedProduct
		? productBreadcrumb(selectedProduct, props.categories)
		: categoryBreadcrumb(categoryIds, props.categories);
	const filteredProducts = useMemo(() => {
		if (props.isSearchingProducts) return [];
		return props.products.slice(0, 50);
	}, [props.isSearchingProducts, props.products]);
	const editableProduct =
		selectedProduct ||
		(props.row.productId
			? ({
					id: props.row.productId,
					title: props.row.description || "",
					unitPrice: getShelfRowBasePrice(props.row),
					categoryId: props.row.categoryId,
				} satisfies ShelfProductOption)
			: null);

	return (
		<div className="space-y-1">
			<div className="flex items-start gap-2">
				<Combobox
					open={open}
					onOpenChange={(nextOpen) => {
						setOpen(nextOpen);
						if (nextOpen && !inputValue.trim()) {
							props.onProductSearchChange?.("");
						}
					}}
					value={props.row.productId ? String(props.row.productId) : ""}
					onValueChange={(next) => {
						const productId = Number(next || 0);
						const product =
							props.products.find(
								(entry) => Number(entry?.id || 0) === productId,
							) || null;
						props.onSelectProduct(product);
						setOpen(false);
					}}
					inputValue={inputValue}
					onInputValueChange={(value) => {
						setInputValue(value);
						props.onProductSearchChange?.(value);
					}}
					manualFiltering
					className="min-w-0 flex-1"
					autoHighlight
					openOnFocus
				>
					<ComboboxAnchor className="relative h-8 px-3">
						<ComboboxInput
							className="h-8 min-w-20 pr-7"
							placeholder="Search product..."
						/>
						{props.row.productId ? (
							<ComboboxTrigger
								onClick={(event) => {
									event.preventDefault();
									props.onSelectProduct(null);
									setInputValue("");
									props.onProductSearchChange?.("");
									setOpen(true);
								}}
								className="absolute right-2 top-2"
							>
								<Icons.X className="size-4" />
							</ComboboxTrigger>
						) : (
							<ComboboxTrigger className="absolute right-2 top-2">
								<Icons.ChevronDown className="size-4" />
							</ComboboxTrigger>
						)}
					</ComboboxAnchor>
					<ComboboxContent
						className="relative overflow-y-auto overflow-x-hidden overscroll-contain"
						style={{ maxHeight: "20rem" }}
					>
						<ComboboxEmpty>
							{props.isSearchingProducts ? "Searching..." : "No product found"}
						</ComboboxEmpty>
						{filteredProducts.map((product) => {
							const breadcrumbText = productBreadcrumb(
								product,
								props.categories,
							);
							return (
								<ComboboxItem
									key={`shelf-inline-product-${product.id}`}
									value={String(product.id)}
									outset
								>
									<div className="min-w-0">
										<p className="truncate text-sm font-medium">
											{product.title}
										</p>
										<div className="flex items-center gap-2 text-[11px] text-muted-foreground">
											<span>
												{props.formatMoney(product.unitPrice) || "$0.00"}
											</span>
											{breadcrumbText ? <span>{breadcrumbText}</span> : null}
										</div>
									</div>
								</ComboboxItem>
							);
						})}
					</ComboboxContent>
				</Combobox>
				{props.onEditProduct && editableProduct ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 shrink-0 px-2"
						onClick={() => props.onEditProduct?.(editableProduct)}
					>
						<Icons.Pencil className="mr-1 size-3.5" />
						Edit
					</Button>
				) : null}
			</div>
			{breadcrumb ? (
				<p
					className="truncate px-1 text-[11px] text-muted-foreground"
					data-shelf-product-category-tree="true"
				>
					{breadcrumb}
				</p>
			) : null}
			{props.isLoadingProduct ? (
				<p className="px-1 text-[11px] text-muted-foreground">
					Loading product details...
				</p>
			) : null}
			{props.productLoadError ? (
				<p className="px-1 text-[11px] text-destructive">
					{props.productLoadError}
				</p>
			) : null}
		</div>
	);
}

export function ShelfInlineItemsEditor(props: ShelfInlineItemsEditorProps) {
	const canEditPricing = props.canEditPricing !== false;
	const [editingProduct, setEditingProduct] =
		useState<ShelfProductOption | null>(null);
	const [isSavingProduct, setIsSavingProduct] = useState(false);
	const [productEditError, setProductEditError] = useState<string | null>(null);
	const [loadingProductRowUid, setLoadingProductRowUid] = useState<
		string | null
	>(null);
	const [productErrorsByRowUid, setProductErrorsByRowUid] = useState<
		Record<string, string>
	>({});
	const entries = props.sections.flatMap((section, sectionIndex) =>
		(section.rows || []).map((row, rowIndex) => ({
			section,
			sectionIndex,
			row,
			rowIndex,
		})),
	);

	async function saveProductEdit(input: ShelfProductEditInput) {
		if (!props.onUpdateProduct || !editingProduct) return;
		setIsSavingProduct(true);
		setProductEditError(null);
		try {
			const updated = await props.onUpdateProduct(input);
			const mergedProduct = {
				...editingProduct,
				...updated,
			} satisfies ShelfProductOption;
			props.onSectionsChange(
				updateShelfProductInSections({
					sections: props.sections,
					product: mergedProduct,
					categories: props.categories,
					profileCoefficient: props.profileCoefficient,
				}),
			);
			setEditingProduct(null);
		} catch (error) {
			setProductEditError(
				error instanceof Error ? error.message : "Could not update product.",
			);
		} finally {
			setIsSavingProduct(false);
		}
	}

	function patchEntry(entry: InlineRowEntry, row: ShelfRowDraft) {
		props.onSectionsChange(replaceSectionRow(props.sections, entry, row));
	}

	async function selectEntryProduct(
		entry: InlineRowEntry,
		product: ShelfProductOption | null,
	) {
		setProductErrorsByRowUid((prev) => {
			const next = { ...prev };
			delete next[entry.row.uid];
			return next;
		});
		let resolvedProduct = product;
		if (product && props.onResolveProductDetails) {
			setLoadingProductRowUid(entry.row.uid);
			try {
				resolvedProduct = await props.onResolveProductDetails(product);
			} catch {
				setProductErrorsByRowUid((prev) => ({
					...prev,
					[entry.row.uid]: "Could not load product details.",
				}));
				setLoadingProductRowUid(null);
				return;
			}
			setLoadingProductRowUid(null);
			if (!resolvedProduct) {
				setProductErrorsByRowUid((prev) => ({
					...prev,
					[entry.row.uid]: "Could not load product details.",
				}));
				return;
			}
		}
		const nextRow = resolvedProduct
			? buildShelfProductRowPatch({
					row: entry.row,
					product: resolvedProduct,
					categories: props.categories,
					profileCoefficient: props.profileCoefficient,
				})
			: clearShelfRowProduct(entry.row);
		props.onSectionsChange(
			replaceRowAsOwnSection(props.sections, entry, nextRow),
		);
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Shelf Items
				</p>
				{props.headerSlot}
			</div>
			<div className="overflow-x-auto rounded-lg border">
				<table className="w-full min-w-[820px] table-fixed text-sm">
					<colgroup>
						<col style={{ width: "2.5rem" }} />
						<col />
						<col style={{ width: "8rem" }} />
						<col style={{ width: "9.5rem" }} />
						<col style={{ width: "8rem" }} />
						<col style={{ width: "5rem" }} />
					</colgroup>
					<thead>
						<tr className="bg-muted/30 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							<th
								scope="col"
								aria-label="Serial number"
								className="px-1 py-2 text-center"
							>
								SN
							</th>
							<th className="px-3 py-2">Product</th>
							<th className="px-3 py-2 text-right">Price</th>
							<th className="px-3 py-2 text-right">Qty</th>
							<th className="px-3 py-2 text-right">Total</th>
							<th className="px-3 py-2 text-right">Delete</th>
						</tr>
					</thead>
					<tbody>
						{entries.map((entry, index) => {
							const unitPrice = getShelfRowDisplayUnitPrice(entry.row);
							const totalPrice = getShelfRowDisplayTotal(entry.row);
							const costPrice = getShelfRowBasePrice(entry.row);
							const qty = Number(entry.row.qty || 0);
							const unitBreakdown = {
								costPrice,
								displayPrice: unitPrice,
							};
							const totalBreakdown = {
								costPrice: multiplyMoney(costPrice, qty),
								unitCostPrice: costPrice,
								quantity: qty,
								displayPrice: totalPrice,
							};

							return (
								<tr
									key={`shelf-inline-row-${entry.section.uid}-${entry.row.uid}-${index}`}
									className="border-t align-top"
								>
									<td className="px-1 py-2 text-center">
										<span className="flex h-8 items-center justify-center text-xs font-semibold text-muted-foreground">
											{index + 1}
										</span>
									</td>
									<td className="min-w-0 px-3 py-2">
										<ShelfInlineProductCell
											row={entry.row}
											products={props.products}
											categories={props.categories}
											formatMoney={props.formatMoney}
											onSelectProduct={(product) =>
												void selectEntryProduct(entry, product)
											}
											onProductSearchChange={props.onProductSearchChange}
											isSearchingProducts={props.isSearchingProducts}
											isLoadingProduct={loadingProductRowUid === entry.row.uid}
											productLoadError={
												productErrorsByRowUid[entry.row.uid] || null
											}
											onEditProduct={
												canEditPricing && props.onUpdateProduct
													? (product) => {
															setProductEditError(null);
															setEditingProduct(product);
														}
													: undefined
											}
										/>
									</td>
									<td className="px-3 py-2">
										{canEditPricing ? (
											<Menu
												noSize
												Icon={null}
												Trigger={
													<Button
														type="button"
														variant="outline"
														className="h-8 w-full justify-end px-2 text-xs font-semibold"
													>
														<CostPriceBreakdownHover
															breakdown={unitBreakdown}
															context={props.priceBreakdown}
														>
															<span>
																{props.formatMoney(unitPrice) || "$0.00"}
															</span>
														</CostPriceBreakdownHover>
													</Button>
												}
											>
												<div className="min-w-[260px] space-y-3 p-2">
													<div className="space-y-1">
														<p className="text-xs font-bold uppercase text-muted-foreground">
															Edit Shelf Price
														</p>
														<p className="text-xs text-muted-foreground">
															Base price recalculates sales price. Custom price
															overrides the final line price.
														</p>
													</div>
													<div className="space-y-2">
														<Label className="text-xs">Base Price</Label>
														<Input
															type="number"
															step="0.01"
															value={getShelfRowBasePrice(entry.row)}
															onChange={(event) =>
																patchEntry(
																	entry,
																	patchShelfRowBasePrice({
																		row: entry.row,
																		basePrice: Number(event.target.value || 0),
																		profileCoefficient: props.profileCoefficient,
																	}),
																)
															}
														/>
													</div>
													<div className="flex justify-between text-xs">
														<span className="text-muted-foreground">
															Calculated Sales
														</span>
														<span className="font-semibold">
															{props.formatMoney(
																getShelfRowSalesPrice(entry.row),
															) || "$0.00"}
														</span>
													</div>
													<div className="space-y-2">
														<Label className="text-xs">Custom Price</Label>
														<Input
															type="number"
															step="0.01"
															value={
																entry.row?.customPrice ??
																entry.row?.meta?.customPrice ??
																""
															}
															onChange={(event) =>
																patchEntry(
																	entry,
																	patchShelfRowCustomPrice({
																		row: entry.row,
																		customPrice:
																			event.target.value === ""
																				? null
																				: Number(event.target.value || 0),
																	}),
																)
															}
														/>
													</div>
												</div>
											</Menu>
										) : (
											<p className="text-right text-xs font-semibold">
												<CostPriceBreakdownHover
													breakdown={unitBreakdown}
													context={props.priceBreakdown}
												>
													<span>{props.formatMoney(unitPrice) || "$0.00"}</span>
												</CostPriceBreakdownHover>
											</p>
										)}
									</td>
									<td className="px-3 py-2">
										<SalesFormQuantityStepper
											label={`Shelf line ${index + 1} quantity`}
											value={entry.row.qty || 0}
											min={0}
											onChange={(value) =>
												patchEntry(entry, patchShelfRowQty(entry.row, value))
											}
											className="w-32"
										/>
									</td>
									<td className="px-3 py-2 text-right text-xs font-bold">
										<CostPriceBreakdownHover
											breakdown={totalBreakdown}
											context={props.priceBreakdown}
										>
											<span>{props.formatMoney(totalPrice) || "$0.00"}</span>
										</CostPriceBreakdownHover>
									</td>
									<td className="px-3 py-2 text-right">
										<ConfirmBtn
											type="button"
											size="icon"
											variant="ghost"
											trash
											aria-label={`Delete shelf line ${index + 1}`}
											onClick={() =>
												props.onSectionsChange(
													deleteSectionRow(props.sections, entry),
												)
											}
										/>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			{editingProduct ? (
				<ShelfProductEditDialog
					key={Number(editingProduct.id || 0)}
					product={editingProduct}
					isSaving={isSavingProduct}
					error={productEditError}
					onCancel={() => {
						if (!isSavingProduct) setEditingProduct(null);
					}}
					onSave={(input) => void saveProductEdit(input)}
				/>
			) : null}
			<Button
				type="button"
				variant="secondary"
				className="w-full uppercase"
				onClick={() =>
					props.onSectionsChange([...props.sections, createShelfSectionDraft()])
				}
			>
				Add New Line
			</Button>
		</div>
	);
}
