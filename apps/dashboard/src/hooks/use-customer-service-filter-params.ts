import type { RouterInputs } from "@api/trpc/routers/_app";
import { useQueryStates } from "nuqs";
import {
	createLoader,
	parseAsArrayOf,
	parseAsInteger,
	parseAsString,
} from "nuqs/server";
type FilterKeys = keyof Exclude<
	RouterInputs["customerService"]["getCustomerServices"],
	void
>;

export const customerServiceFilterParams = {
	q: parseAsString,
	status: parseAsArrayOf(parseAsString),
	scheduleDate: parseAsArrayOf(parseAsString),
	dateRange: parseAsArrayOf(parseAsString),
	techId: parseAsArrayOf(parseAsInteger),
} satisfies Partial<Record<FilterKeys, unknown>>;

export function useCustomerServiceFilterParams() {
	const [filters, setFilters] = useQueryStates(customerServiceFilterParams);
	return {
		filters,
		setFilters,
		hasFilters: Object.values(filters).some((value) => value !== null),
	};
}
export const loadCustomerServiceFilterParams = createLoader(
	customerServiceFilterParams,
);
