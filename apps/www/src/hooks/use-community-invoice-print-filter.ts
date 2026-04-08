import { createLoader, parseAsBoolean, parseAsString } from "nuqs/server";
import { useQueryStates } from "nuqs";

export const communityInvoicePrintFilterParams = {
	token: parseAsString,
	preview: parseAsBoolean.withDefault(false),
};

export function useCommunityInvoicePrintFilter() {
	const [filters, setFilters] = useQueryStates(
		communityInvoicePrintFilterParams,
	);

	return {
		filters,
		setFilters,
	};
}

export const loadCommunityInvoicePrintFilterParams = createLoader(
	communityInvoicePrintFilterParams,
);
