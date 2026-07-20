import { profileAdjustedDoorSalesPrice } from "./door-pricing";
import { readSalesFormObjectMetadata } from "../../domain";
import {
	multiplyMoney,
	roundMoney,
} from "../../../payment-system/domain/money";
import type {
	ShelfCategoryRecord,
	ShelfProductOption,
	ShelfRowDraft,
} from "./workflow-records";

function roundCurrency(value: unknown) {
	return roundMoney(Number(value || 0));
}

function uniquePositiveNumbers(values: Array<number | null | undefined>) {
	return values
		.map((value) => Number(value || 0))
		.filter((value, index, list) => value > 0 && list.indexOf(value) === index);
}

function firstFiniteValue(...values: Array<number | null | undefined>) {
	for (const value of values) {
		const candidate = Number(value);
		if (Number.isFinite(candidate) && candidate > 0) return candidate;
	}
	return 0;
}

function readShelfRowMeta(row?: ShelfRowDraft | null) {
	return readSalesFormObjectMetadata(row?.meta) || {};
}

function getShelfRowDisplayUnitPrice(row: ShelfRowDraft) {
	const meta = readShelfRowMeta(row);
	return firstFiniteValue(
		typeof row?.customPrice === "number" ? row.customPrice : undefined,
		typeof meta.customPrice === "number" ? meta.customPrice : undefined,
		row?.salesPrice,
		meta.salesPrice,
		row?.unitPrice,
		meta.unitPrice,
		row?.basePrice,
		meta.basePrice,
	);
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

export function patchShelfRowPrice(row: ShelfRowDraft, unitPrice: number) {
	const nextPrice = roundCurrency(unitPrice);
	const qty = Number(row?.qty ?? 1);
	const meta = readShelfRowMeta(row);
	return {
		...row,
		customPrice: nextPrice,
		unitPrice: nextPrice,
		totalPrice: multiplyMoney(qty, nextPrice),
		meta: {
			...meta,
			customPrice: nextPrice,
			unitPrice: nextPrice,
		},
	};
}

export function clearShelfRowCustomPrice(row: ShelfRowDraft) {
	const meta = readShelfRowMeta(row);
	const nextPrice = firstFiniteValue(
		row?.salesPrice,
		meta.salesPrice,
		row?.unitPrice,
		meta.unitPrice,
		row?.basePrice,
		meta.basePrice,
	);
	const qty = Number(row?.qty ?? 1);
	return {
		...row,
		customPrice: null,
		unitPrice: nextPrice,
		totalPrice: multiplyMoney(qty, nextPrice),
		meta: {
			...meta,
			customPrice: null,
			unitPrice: nextPrice,
		},
	};
}

export function patchShelfRowQty(row: ShelfRowDraft, qty: number) {
	const nextQty = Number(qty || 0);
	const unitPrice = getShelfRowDisplayUnitPrice(row);
	return {
		...row,
		qty: nextQty,
		totalPrice: multiplyMoney(nextQty, unitPrice),
	};
}

export function clearShelfRowProduct(row: ShelfRowDraft) {
	const meta = readShelfRowMeta(row);
	return {
		...row,
		categoryId: null,
		productId: null,
		description: "",
		basePrice: 0,
		salesPrice: 0,
		customPrice: null,
		unitPrice: 0,
		totalPrice: 0,
		meta: {
			...meta,
			categoryIds: [],
			shelfParentCategoryId: null,
			basePrice: 0,
			salesPrice: 0,
			customPrice: null,
			unitPrice: 0,
		},
	};
}

export function buildShelfProductRowPatch(input: {
	row: ShelfRowDraft;
	product: ShelfProductOption;
	categories?: ShelfCategoryRecord[];
	profileCoefficient: number;
}) {
	const categoryIds = productCategoryPath(input.product, input.categories || []);
	const categoryId =
		Number(input.product?.categoryId || 0) ||
		(categoryIds.length ? categoryIds[categoryIds.length - 1] : null) ||
		null;
	const parentCategoryId =
		Number(input.product?.parentCategoryId || 0) ||
		(categoryIds.length ? categoryIds[0] : null) ||
		null;
	const basePrice = Number(input.product?.unitPrice || 0);
	const salesPrice = profileAdjustedDoorSalesPrice(
		null,
		basePrice,
		input.profileCoefficient,
	);
	const unitPrice = salesPrice;
	const qty = Number(input.row?.qty ?? 1);
	const meta = readShelfRowMeta(input.row);
	return {
		...input.row,
		categoryId,
		productId: Number(input.product?.id || 0) || null,
		description: String(input.product?.title || ""),
		basePrice,
		salesPrice,
		customPrice: null,
		unitPrice,
		totalPrice: roundCurrency(qty * unitPrice),
		meta: {
			...meta,
			categoryIds,
			shelfParentCategoryId: parentCategoryId,
			basePrice,
			salesPrice,
			customPrice: null,
			unitPrice,
		},
	};
}
