import { useQueryStates } from "nuqs";
import { createLoader, parseAsJson, parseAsInteger } from "nuqs/server";
import { z } from "zod";

export const productFilterParamsSchema = {
  qty: parseAsInteger,
  variantId: parseAsInteger,
  subComponent: parseAsJson(
    z.record(
      z.object({
        variantId: z.number().optional().nullable(),
        inventoryId: z.number().optional().nullable(),
        qty: z.number().optional().nullable(),
        price: z.number().optional().nullable(),
      })
    ).parse
  ),
};
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
