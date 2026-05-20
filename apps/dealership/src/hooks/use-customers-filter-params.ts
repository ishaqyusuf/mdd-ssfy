import type { RouterInputs } from "@api/trpc/routers/_app";
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

type FilterKeys = keyof Exclude<
	RouterInputs["dealerPortal"]["customersList"],
	void
>;

export const customersFilterParamsSchema = {
	q: parseAsString,
	"customer.name": parseAsString,
	phone: parseAsString,
	profile: parseAsString,
} satisfies Partial<Record<FilterKeys, unknown>>;

export function useCustomersFilterParams() {
	const [filters, setFilters] = useQueryStates(customersFilterParamsSchema);

	return {
		filters,
		setFilters,
		hasFilters: Object.values(filters).some((value) => value !== null),
		isPending: false,
	};
}

export const loadCustomersFilterParams = createLoader(customersFilterParamsSchema);
