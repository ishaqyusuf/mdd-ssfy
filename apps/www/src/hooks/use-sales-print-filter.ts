import { useQueryStates } from "nuqs";
import { parseAsBoolean, parseAsString } from "nuqs/server";

const salesPrintFilterSchema = {
	pt: parseAsString,
	token: parseAsString,
	accessToken: parseAsString,
	snapshotId: parseAsString,
	templateId: parseAsString,
	pageBreakMode: parseAsString,
	showImages: parseAsBoolean,
	headlineFirstPage: parseAsBoolean,
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
