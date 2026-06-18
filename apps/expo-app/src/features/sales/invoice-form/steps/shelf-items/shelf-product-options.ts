import {
  getShelfLeafCategoryIds,
  type ShelfCategoryRecord,
  type ShelfProductOption,
} from "@gnd/sales/sales-form-core";

export const MOBILE_SHELF_PRODUCT_LIMIT = 20;

export function buildShelfProductBuckets(products: ShelfProductOption[]) {
  const buckets = new Map<number, ShelfProductOption[]>();
  for (const product of products) {
    const keys = [
      Number(product.categoryId || 0),
      Number(product.parentCategoryId || 0),
    ].filter((id) => id > 0);
    for (const key of keys) {
      const list = buckets.get(key) || [];
      list.push(product);
      buckets.set(key, list);
    }
  }
  return buckets;
}

export function getVisibleShelfProducts(input: {
  categories: ShelfCategoryRecord[];
  productBuckets: Map<number, ShelfProductOption[]>;
  categoryIds: number[];
  query?: string | null;
  limit?: number;
}) {
  const lastCategoryId = input.categoryIds.length
    ? input.categoryIds[input.categoryIds.length - 1]
    : null;
  const normalizedQuery = String(input.query || "").trim().toLowerCase();
  const leafCategoryIds = lastCategoryId
    ? getShelfLeafCategoryIds(input.categories, lastCategoryId)
    : [];
  const sourceProducts = leafCategoryIds.length
    ? leafCategoryIds.flatMap(
        (categoryId) => input.productBuckets.get(Number(categoryId || 0)) || [],
      )
    : normalizedQuery
      ? Array.from(
          new Map(
            Array.from(input.productBuckets.values())
              .flat()
              .map((product) => [Number(product.id || 0), product] as const),
          ).values(),
        )
      : [];
  const products = Array.from(
    new Map(
      sourceProducts
        .map((product) => [Number(product.id || 0), product] as const),
    ).values(),
  ).filter((product) => {
    if (!normalizedQuery) return true;
    return String(product.title || "").toLowerCase().includes(normalizedQuery);
  });
  const limit = input.limit ?? MOBILE_SHELF_PRODUCT_LIMIT;
  const visibleProducts = products.slice(0, limit);
  return {
    leafCategoryIds,
    totalCount: products.length,
    visibleProducts,
    hasMoreProducts: products.length > visibleProducts.length,
  };
}
