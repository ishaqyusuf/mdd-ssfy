import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

export const salesPrintFilterSchema = {
    token: parseAsString,
};

export function useSalesPrintFilter() {
    const [filters, setFilters] = useQueryStates(salesPrintFilterSchema);

    return {
        filters,
        setFilters,
    };
}
export const loadSalesPrintFilterParams = createLoader(salesPrintFilterSchema);

