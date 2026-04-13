import { parseAsString, useQueryStates } from "nuqs";
import { createLoader } from "nuqs/server";
import { InventoryImport } from "@gnd/inventory/schema";
import { parseAsStringEnum } from "nuqs/server";
type FilterKeys = keyof InventoryImport;

export const inventoryImportFilterParamsSchema = {
    q: parseAsString,
    scope: parseAsStringEnum(["active", "all"]),
} satisfies Partial<Record<FilterKeys, any>>;

export function useInventoryImportFilterParams() {
    const [filters, setFilters] = useQueryStates(
        inventoryImportFilterParamsSchema,
    );
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadInventoryImportFilterParams = createLoader(
    inventoryImportFilterParamsSchema,
);
