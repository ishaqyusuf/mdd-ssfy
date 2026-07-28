import type { RouterInputs } from "@api/trpc/routers/_app";
import { useQueryStates } from "nuqs";
import {
	createLoader,
	parseAsArrayOf,
	parseAsString,
	parseAsStringLiteral,
} from "nuqs/server";
import { SALES_PRIORITY_VALUES } from "@sales/priority";
import {
	INVOICE_FILTER_OPTIONS,
	PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
	PRODUCTION_FILTER_OPTIONS,
	PRODUCTION_STATUS,
	SALES_DISPATCH_FILTER_OPTIONS,
} from "@gnd/utils/constants";
import { SALES_HAS_FILTER_OPTIONS } from "@sales/filter-constants";

import { useAuth } from "./use-auth";

type FilterKeys = keyof Exclude<RouterInputs["sales"]["index"], void>;

export const salesFilterParamsSchema = {
	q: parseAsString,
	"customer.name": parseAsString,
	phone: parseAsString,
	po: parseAsString,
	item: parseAsString,
	"sales.rep": parseAsString,
	orderNo: parseAsString,
	"production.assignment": parseAsStringLiteral(PRODUCTION_ASSIGNMENT_FILTER_OPTIONS),
	"production.status": parseAsStringLiteral(PRODUCTION_STATUS),
	"dispatch.status": parseAsStringLiteral(SALES_DISPATCH_FILTER_OPTIONS),
	"sales.priority": parseAsStringLiteral(SALES_PRIORITY_VALUES),
	has: parseAsStringLiteral(SALES_HAS_FILTER_OPTIONS),
	production: parseAsStringLiteral(PRODUCTION_FILTER_OPTIONS),
	invoice: parseAsStringLiteral(INVOICE_FILTER_OPTIONS),
	dateRange: parseAsArrayOf(parseAsString),
	showing: parseAsString,
} satisfies Partial<Record<FilterKeys, unknown>>;

export function useOrderFilterParams() {
	const [filters, setFilters] = useQueryStates(salesFilterParamsSchema);
	const auth = useAuth();

	return {
		filters: {
			...filters,
			showing: auth?.can?.viewSalesManager ? "all sales" : null,
		},
		setFilters,
		hasFilters: Object.values(filters).some((value) => value !== null),
		isPending: auth.isPending,
	};
}

export const loadOrderFilterParams = createLoader(salesFilterParamsSchema);
