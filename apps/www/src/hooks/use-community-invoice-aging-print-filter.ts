import { createLoader, parseAsBoolean, parseAsString } from "nuqs/server";
import { useQueryStates } from "nuqs";

export const communityInvoiceAgingPrintFilterParams = {
	token: parseAsString,
	preview: parseAsBoolean.withDefault(false),
};

export function useCommunityInvoiceAgingPrintFilter() {
	const [filters, setFilters] = useQueryStates(
		communityInvoiceAgingPrintFilterParams,
	);

	return {
		filters,
		setFilters,
	};
}

export const loadCommunityInvoiceAgingPrintFilterParams = createLoader(
	communityInvoiceAgingPrintFilterParams,
);
