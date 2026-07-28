import { useQueryStates } from "nuqs";
import { createLoader, parseAsBoolean, parseAsString } from "nuqs/server";

const jobsPrintFilterSchema = {
	token: parseAsString,
	preview: parseAsBoolean,
};

export function useJobsPrintFilter() {
	const [filters, setFilters] = useQueryStates(jobsPrintFilterSchema);

	return {
		filters,
		setFilters,
	};
}

export const loadJobsPrintFilterParams = createLoader(jobsPrintFilterSchema);
