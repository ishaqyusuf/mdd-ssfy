import { useQueryStates } from "nuqs";
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import { inventoryProductKindSchema } from "@gnd/inventory/schema";
import { parseAsStringEnum } from "nuqs";
import { InventoryList } from "@gnd/inventory/schema";
type FilterKeys = keyof InventoryList;

export const inventoryFilterParamsSchema = {
    q: parseAsString,
    categoryId: parseAsInteger,
    productKind: parseAsStringEnum(inventoryProductKindSchema.options),
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
