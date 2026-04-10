import { useQueryStates } from "nuqs";
import { createLoader, parseAsBoolean, parseAsString } from "nuqs/server";

const salesPrintFilterSchema = {
    token: parseAsString,
    preview: parseAsBoolean,
};

export function useSalesPrintFilter() {
    const [filters, setFilters] = useQueryStates(salesPrintFilterSchema);

    return {
        filters,
        setFilters,
    };
}
export const loadSalesPrintFilterParams = createLoader(salesPrintFilterSchema);

