import { createLoader, parseAsBoolean, parseAsString } from "nuqs/server";
import { useQueryStates } from "nuqs";

export const contractorPayoutPrintFilterParams = {
	token: parseAsString,
	preview: parseAsBoolean.withDefault(false),
};

export function useContractorPayoutPrintFilter() {
	const [filters, setFilters] = useQueryStates(contractorPayoutPrintFilterParams);

	return {
		filters,
		setFilters,
	};
}

export const loadContractorPayoutPrintFilterParams = createLoader(
	contractorPayoutPrintFilterParams,
);
