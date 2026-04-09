import { ProductSearch } from "@sales/storefront";
import {
  createLoader,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";

const productsFilterParamsSchema = {
  q: parseAsString,
  inStock: parseAsBoolean,
  categorySlug: parseAsString,
  subCategorySlug: parseAsString,
  priceMin: parseAsInteger,
  priceMax: parseAsInteger,
  sort: parseAsString,
  // sortBy: parseAsString,
} satisfies Partial<Record<keyof ProductSearch, any>>;
export function useProductsFilterParams() {
  const [filter, setFilter] = useQueryStates(productsFilterParamsSchema);
  const filterCount = Object.values(filter).filter(
    (value) => value !== null
  )?.length;

  return {
    filter,
    setFilter,
    filterCount,
    hasFilters: !!filterCount,
    clearAllFilters() {
      setFilter(null);
    },
  };
}
const loadProductsFilterParams = createLoader(
  productsFilterParamsSchema
);
