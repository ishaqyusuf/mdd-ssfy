import type { RouterInputs } from "@api/trpc/routers/_app";
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

type FilterKeys = keyof Exclude<RouterInputs["jobs"]["contractorPayouts"], void>;

export const contractorPayoutFilterParams = {
	q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useContractorPayoutFilterParams() {
	const [filters, setFilters] = useQueryStates(contractorPayoutFilterParams);

	return {
		filters,
		setFilters,
		hasFilters: Object.values(filters).some((value) => value !== null),
	};
}

export const loadContractorPayoutFilterParams = createLoader(
	contractorPayoutFilterParams,
);
