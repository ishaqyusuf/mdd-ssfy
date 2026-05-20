import type { RouterInputs } from "@api/trpc/routers/_app";
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

type FilterKeys = keyof Exclude<RouterInputs["dealerPortal"]["orders"], void>;

export const ordersFilterParamsSchema = {
	q: parseAsString,
	"customer.name": parseAsString,
	phone: parseAsString,
	orderNo: parseAsString,
	status: parseAsString,
} satisfies Partial<Record<FilterKeys, unknown>>;

export function useOrdersFilterParams() {
	const [filters, setFilters] = useQueryStates(ordersFilterParamsSchema);

	return {
		filters,
		setFilters,
		hasFilters: Object.values(filters).some((value) => value !== null),
		isPending: false,
	};
}

export const loadOrdersFilterParams = createLoader(ordersFilterParamsSchema);
