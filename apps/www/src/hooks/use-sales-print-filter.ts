import { useQueryStates } from "nuqs";
import { createLoader, parseAsBoolean, parseAsString } from "nuqs/server";

export const salesPrintFilterSchema = {
	pt: parseAsString,
	token: parseAsString,
	accessToken: parseAsString,
	snapshotId: parseAsString,
	templateId: parseAsString,
	mode: parseAsString,
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
