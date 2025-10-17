import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { createLoader } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
import { InventoryList } from "@sales/schema";
type FilterKeys = keyof InventoryList;

export const inventoryImportFilterParamsSchema = {
    q: parseAsString,
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

