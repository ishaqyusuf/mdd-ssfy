import { ProductOverview } from "@sales/storefront";
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

export const productFilterParamsSchema = {};
// productSlug: parseAsString,
// categorySlug: parseAsString,
// } satisfies Partial<Record<keyof ProductOverview, any>>;
export function useProductFilterParams() {
  const [filter, setFilter] = useQueryStates(productFilterParamsSchema);

  return {
    filter,
    setFilter,
  };
}
export const loadProductFilterParams = createLoader(productFilterParamsSchema);
