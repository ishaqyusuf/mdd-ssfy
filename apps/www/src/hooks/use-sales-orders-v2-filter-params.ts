import type { RouterInputs } from "@api/trpc/routers/_app";
import {
	INVOICE_FILTER_OPTIONS,
	PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
	PRODUCTION_FILTER_OPTIONS,
	PRODUCTION_STATUS,
	SALES_DISPATCH_FILTER_OPTIONS,
} from "@gnd/utils/constants";
import {
	SALES_CHANNEL_FILTER_OPTIONS,
	SALES_HAS_FILTER_OPTIONS,
} from "@sales/filter-constants";
import { SALES_PRIORITY_VALUES } from "@sales/priority";
import { useQueryStates } from "nuqs";
import {
	createLoader,
	parseAsArrayOf,
	parseAsString,
	parseAsStringLiteral,
} from "nuqs/server";

type FilterKeys = keyof Exclude<RouterInputs["sales"]["getOrders"], void>;

export const salesOrdersV2FilterParams = {
	q: parseAsString,
	dateRange: parseAsArrayOf(parseAsString),
	customerName: parseAsString,
	"customer.name": parseAsString,
	phone: parseAsString,
	po: parseAsString,
	item: parseAsString,
	orderNo: parseAsString,
	salesNo: parseAsString,
	invoiceStatus: parseAsStringLiteral(["paid", "outstanding"] as const),
	invoice: parseAsStringLiteral(INVOICE_FILTER_OPTIONS),
	paymentReview: parseAsStringLiteral(["needs_review"] as const),
	production: parseAsStringLiteral(PRODUCTION_FILTER_OPTIONS),
	"production.status": parseAsStringLiteral(PRODUCTION_STATUS),
	"production.assignment": parseAsStringLiteral(
		PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
	),
	"dispatch.status": parseAsStringLiteral(SALES_DISPATCH_FILTER_OPTIONS),
	priority: parseAsStringLiteral(SALES_PRIORITY_VALUES),
	"sales.priority": parseAsStringLiteral(SALES_PRIORITY_VALUES),
	"sales.rep": parseAsString,
	has: parseAsStringLiteral(SALES_HAS_FILTER_OPTIONS),
	salesChannel: parseAsStringLiteral(SALES_CHANNEL_FILTER_OPTIONS),
	showing: parseAsString,
} satisfies Partial<Record<FilterKeys, unknown>>;

export function useSalesOrdersV2FilterParams() {
	const [filters, setFilters] = useQueryStates(salesOrdersV2FilterParams);

	return {
		filters: {
			...filters,
			showing: "all sales" as const,
		},
		setFilters,
		hasFilters: Object.values(filters).some((value) => value !== null),
	};
}

export const loadSalesOrdersV2FilterParams = createLoader(
	salesOrdersV2FilterParams,
);
