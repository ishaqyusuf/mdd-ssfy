import { useQueryStates } from "nuqs";
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import { InventoryList } from "@sales/schema";
type FilterKeys = keyof InventoryList;

export const inventoryFilterParamsSchema = {
    q: parseAsString,
    categoryId: parseAsInteger,
} satisfies Partial<Record<FilterKeys, any>>;

export function useInventoryFilterParams() {
    const [filters, setFilters] = useQueryStates(inventoryFilterParamsSchema);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadInventoryFilterParams = createLoader(
    inventoryFilterParamsSchema,
);

