import { useQueryStates } from "nuqs";
import {
    createLoader,
    parseAsBoolean,
    parseAsInteger,
    parseAsString,
    parseAsStringEnum,
} from "nuqs/server";
import { inventoryProductKindSchema } from "@gnd/inventory/schema";
import { InventoryList } from "@gnd/inventory/schema";
type FilterKeys = keyof InventoryList;

export const inventoryFilterParamsSchema = {
    q: parseAsString,
    categoryId: parseAsInteger,
    productKind: parseAsStringEnum(inventoryProductKindSchema.options),
    showCustom: parseAsBoolean,
} satisfies Partial<Record<FilterKeys, any>>;

export function useInventoryFilterParams() {
    const [filters, setFilters] = useQueryStates(inventoryFilterParamsSchema);
    return {
        filters,
        setFilters,
        hasFilters: Object.entries(filters).some(([key, value]) => {
            if (key === "showCustom") return value === true;
            return value !== null;
        }),
    };
}
export const loadInventoryFilterParams = createLoader(
    inventoryFilterParamsSchema,
);
