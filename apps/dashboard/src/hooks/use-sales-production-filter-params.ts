import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { createLoader, parseAsStringLiteral } from "nuqs/server";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { SALES_PRIORITY_VALUES } from "@sales/priority";
import { PRODUCTION_FILTER_OPTIONS } from "@gnd/utils/constants";
type FilterKeys = keyof Exclude<RouterInputs["sales"]["productions"], void>;

export const salesProductionFilterParamsSchema = {
	q: parseAsString,
	assignedToId: parseAsInteger,
	production: parseAsStringLiteral(PRODUCTION_FILTER_OPTIONS),
	productionDueDate: parseAsString,
	priority: parseAsStringLiteral(SALES_PRIORITY_VALUES),
	salesNo: parseAsString,
	show: parseAsStringLiteral(["due-today", "due-tomorrow", "past-due"] as const),
} satisfies Partial<Record<FilterKeys, unknown>>;

export function useSalesProductionFilterParams() {
	const [filters, setFilters] = useQueryStates(
		salesProductionFilterParamsSchema,
	);
	return {
		filters,
		setFilters,
		hasFilters: Object.values(filters).some((value) => value !== null),
	};
}
export const loadSalesProductionFilterParams = createLoader(
	salesProductionFilterParamsSchema,
);
