import { readSalesFormObjectMetadata } from "../../domain";
import { multiplyMoney } from "../../../payment-system/domain/money";

export type ShelfCategoryLike = {
	id?: number | null;
	name?: string | null;
	type?: string | null;
	categoryId?: number | null;
	parentCategoryId?: number | null;
	[key: string]: unknown;
};

export type ShelfProductLike = {
	id?: number | null;
	title?: string | null;
	img?: string | null;
	unitPrice?: number | null;
	[key: string]: unknown;
};

export type ShelfRowLike = {
	qty?: number | null;
	basePrice?: number | null;
	salesPrice?: number | null;
	customPrice?: number | string | null;
	unitPrice?: number | null;
	totalPrice?: number | null;
	meta?: {
		basePrice?: number | null;
		salesPrice?: number | null;
		customPrice?: number | string | null;
		unitPrice?: number | null;
		[key: string]: unknown;
	} | string | null;
	[key: string]: unknown;
};

export function getShelfChildCategories(
	categories: ShelfCategoryLike[],
	parentId?: number | null,
) {
	return categories.filter((category) => {
		const categoryParentId = Number(
			category?.categoryId ?? category?.parentCategoryId ?? 0,
		);
		if (!parentId) {
			return String(category?.type || "").toLowerCase() === "parent";
		}
		return categoryParentId === Number(parentId || 0);
	});
}

export function getShelfLeafCategoryIds(
	categories: ShelfCategoryLike[],
	categoryId?: number | null,
) {
	const targetId = Number(categoryId || 0);
	if (!targetId) return [];
	const children = getShelfChildCategories(categories, targetId);
	if (!children.length) return [targetId];
	return children.flatMap((child) =>
		getShelfLeafCategoryIds(categories, Number(child?.id || 0)),
	);
}

export function buildShelfProductsById(products: ShelfProductLike[]) {
	return new Map(
		products.map((product) => [Number(product?.id || 0), product]),
	);
}

function firstFiniteValue(...values: Array<number | null | undefined>) {
	for (const value of values) {
		const candidate = Number(value);
		if (Number.isFinite(candidate) && candidate > 0) return candidate;
	}
	return 0;
}

export function getShelfRowBasePrice(row: ShelfRowLike) {
	const meta = readSalesFormObjectMetadata(row?.meta) || {};
	return firstFiniteValue(row?.basePrice, meta.basePrice);
}

export function getShelfRowSalesPrice(row: ShelfRowLike) {
	const meta = readSalesFormObjectMetadata(row?.meta) || {};
	return firstFiniteValue(
		row?.salesPrice,
		meta.salesPrice,
		row?.unitPrice,
		meta.unitPrice,
		row?.basePrice,
		meta.basePrice,
	);
}

export function getShelfRowDisplayUnitPrice(row: ShelfRowLike) {
	const meta = readSalesFormObjectMetadata(row?.meta) || {};
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

export function getShelfRowDisplayTotal(row: ShelfRowLike) {
	const explicitTotal = Number(row?.totalPrice);
	if (Number.isFinite(explicitTotal) && explicitTotal > 0) return explicitTotal;
	return multiplyMoney(
		Number(row?.qty || 0),
		getShelfRowDisplayUnitPrice(row),
	);
}
