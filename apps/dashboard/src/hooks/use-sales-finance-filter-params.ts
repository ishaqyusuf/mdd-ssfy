import { transformFilterDateToQuery } from "@gnd/utils";
import { format } from "date-fns";
import { useQueryStates } from "nuqs";
import {
	createLoader,
	parseAsArrayOf,
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
} from "nuqs/server";

const financeTabs = ["all", "review", "receivables", "resolution"] as const;
const DATE_ONLY_FORMAT = "yyyy-MM-dd";

type SalesFinanceDateFilterParams = {
	dateRange?: readonly (string | null | undefined)[] | null;
	from?: string | null;
	to?: string | null;
};

function formatDateOnly(value: string) {
	return format(new Date(value), DATE_ONLY_FORMAT);
}

export function resolveSalesFinanceDateFilters(
	params: SalesFinanceDateFilterParams,
) {
	if (!params.dateRange?.length) {
		return { from: params.from, to: params.to };
	}

	const range = transformFilterDateToQuery(params.dateRange);
	if (!range) return { from: null, to: null };

	return {
		from: range.gte ? formatDateOnly(range.gte) : null,
		to: range.lte ? formatDateOnly(range.lte) : null,
	};
}

export const salesFinanceFilterParams = {
	q: parseAsString,
	dateRange: parseAsArrayOf(parseAsString),
	from: parseAsString,
	to: parseAsString,
	paymentMethods: parseAsArrayOf(parseAsString),
	statuses: parseAsArrayOf(parseAsString),
	exceptionCodes: parseAsArrayOf(parseAsString),
	applicationStatuses: parseAsArrayOf(parseAsString),
	tab: parseAsStringLiteral(financeTabs).withDefault("all"),
	transactionId: parseAsInteger,
	dueDateRange: parseAsArrayOf(parseAsString),
	agingBuckets: parseAsArrayOf(parseAsString),
	receivableId: parseAsInteger,
};

export const salesFinanceSearchFilterParams = {
	q: salesFinanceFilterParams.q,
	dateRange: salesFinanceFilterParams.dateRange,
	paymentMethods: salesFinanceFilterParams.paymentMethods,
	statuses: salesFinanceFilterParams.statuses,
	exceptionCodes: salesFinanceFilterParams.exceptionCodes,
	applicationStatuses: salesFinanceFilterParams.applicationStatuses,
};

export const salesFinanceReceivablesSearchFilterParams = {
	q: salesFinanceFilterParams.q,
	dueDateRange: salesFinanceFilterParams.dueDateRange,
	agingBuckets: salesFinanceFilterParams.agingBuckets,
};

export const loadSalesFinanceFilterParams = createLoader(
	salesFinanceFilterParams,
);

export function useSalesFinanceFilterParams() {
	const [params, setParams] = useQueryStates(salesFinanceFilterParams, {
		shallow: false,
	});
	const {
		q,
		dateRange,
		from,
		to,
		paymentMethods,
		statuses,
		exceptionCodes,
		applicationStatuses,
		tab,
		dueDateRange,
		agingBuckets,
	} = params;
	const normalizedDateFilters = resolveSalesFinanceDateFilters({
		dateRange,
		from,
		to,
	});
	const filters = {
		q,
		...normalizedDateFilters,
		paymentMethods,
		statuses,
		exceptionCodes,
		applicationStatuses,
		tab,
	};
	const hasFilters = Boolean(
		q ||
			dateRange?.length ||
			from ||
			to ||
			paymentMethods?.length ||
			statuses?.length ||
			exceptionCodes?.length ||
			applicationStatuses?.length ||
			tab === "review",
	);
	const [dueFrom, dueTo] = dueDateRange || [];
	const receivableFilters = {
		q,
		from: dueFrom && dueFrom !== "-" ? dueFrom : null,
		to: dueTo && dueTo !== "-" ? dueTo : null,
		agingBuckets,
	};
	const hasReceivableFilters = Boolean(
		q || dueDateRange?.length || agingBuckets?.length,
	);

	return {
		params,
		filters,
		receivableFilters,
		setParams,
		hasFilters,
		hasReceivableFilters,
	};
}
