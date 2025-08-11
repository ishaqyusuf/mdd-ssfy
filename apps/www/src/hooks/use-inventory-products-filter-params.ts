import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { createLoader } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
import { InventoryProductsList } from "@sales/schema";
type FilterKeys = keyof InventoryProductsList;

export const inventoryProductsFilterParamsSchema = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useInventoryProductsFilterParams() {
    const [filters, setFilters] = useQueryStates(
        inventoryProductsFilterParamsSchema,
    );
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadInventoryProductsFilterParams = createLoader(
    inventoryProductsFilterParamsSchema,
);

