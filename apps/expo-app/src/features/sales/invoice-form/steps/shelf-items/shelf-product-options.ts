import {
  readSalesFormObjectMetadata,
  type ShelfCategoryRecord,
  type ShelfProductOption,
} from "@gnd/sales/sales-form-core";

export function formatShelfProductCategoryPath(
  product: Pick<
    ShelfProductOption,
    "categoryId" | "parentCategoryId" | "categoryPath"
  >,
  categories: ShelfCategoryRecord[],
) {
  const apiPath = Array.isArray(product.categoryPath)
    ? product.categoryPath
        .map((entry) =>
          typeof entry === "object" && entry
            ? String(entry.name || "").trim()
            : "",
        )
        .filter(Boolean)
    : [];
  if (apiPath.length) return apiPath.join(" / ");

  return formatCategoryIds(
    [Number(product.parentCategoryId || 0), Number(product.categoryId || 0)],
    categories,
  );
}

export function formatShelfRowCategoryPath(
  row: ShelfRowCategoryPathSource,
  categories: ShelfCategoryRecord[],
) {
  const meta = readSalesFormObjectMetadata(row.meta) || {};
  const metaCategoryIds = Array.isArray(meta?.categoryIds)
    ? meta.categoryIds
    : [];
  return formatCategoryIds(
    [
      ...metaCategoryIds.map((id) => Number(id || 0)),
      Number(meta?.shelfParentCategoryId || 0),
      Number(row.categoryId || 0),
    ],
    categories,
  );
}

export function buildShelfProductSearchInput(query?: string | null) {
  const normalizedQuery = String(query || "").trim();
  return {
    query: normalizedQuery,
    selectedIds: [],
    limit: normalizedQuery ? 20 : 15,
  };
}

type ShelfRowCategoryPathSource = {
  categoryId?: number | null;
  meta?: unknown;
};

function formatCategoryIds(ids: number[], categories: ShelfCategoryRecord[]) {
  const byId = new Map(
    categories
      .map((category) => [Number(category.id || 0), category] as const)
      .filter(([id]) => id > 0),
  );
  const labels = ids
    .filter((id, index, list) => id > 0 && list.indexOf(id) === index)
    .map((id) => byId.get(id)?.name)
    .filter(Boolean);
  return labels.length ? labels.join(" / ") : "Uncategorized";
}
