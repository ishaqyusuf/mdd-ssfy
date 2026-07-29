import { useQueryStates } from "nuqs";
import { createLoader, parseAsBoolean, parseAsString } from "nuqs/server";

const contractorAccountingPrintFilterParams = {
	token: parseAsString,
	preview: parseAsBoolean.withDefault(false),
};

export function useContractorAccountingPrintFilter() {
	const [filters, setFilters] = useQueryStates(
		contractorAccountingPrintFilterParams,
	);

	return { filters, setFilters };
}

export const loadContractorAccountingPrintFilterParams = createLoader(
	contractorAccountingPrintFilterParams,
);
