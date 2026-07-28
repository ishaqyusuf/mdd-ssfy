import type { RouterInputs } from "@api/trpc/routers/_app";
import { useQueryStates } from "nuqs";
import {
	createLoader,
	parseAsArrayOf,
	parseAsBoolean,
	parseAsInteger,
	parseAsString,
} from "nuqs/server";
type FilterKeys = keyof Exclude<
	RouterInputs["sales"]["getSalesAccountings"],
	void
>;

export const salesAccountingFilterParams = {
	q: parseAsString,
	orderNo: parseAsString,
	accountNo: parseAsString,
	status: parseAsString,
	paymentType: parseAsString,
	salesRepId: parseAsInteger,
	from: parseAsString,
	to: parseAsString,
	payments: parseAsString,
	dateRange: parseAsArrayOf(parseAsString),
	d: parseAsBoolean,
} satisfies Partial<Record<FilterKeys, unknown>>;

export function useSalesAccountingFilterParams() {
	const [filters, setFilters] = useQueryStates(salesAccountingFilterParams);
	return {
		filters,
		setFilters,
		hasFilters: Object.values(filters).some((value) => value !== null),
	};
}
export const loadSalesAccountingFilterParams = createLoader(
	salesAccountingFilterParams,
);
