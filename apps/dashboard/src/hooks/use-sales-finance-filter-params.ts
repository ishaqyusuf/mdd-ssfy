import { useQueryStates } from "nuqs";
import {
	createLoader,
	parseAsArrayOf,
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
} from "nuqs/server";

const financeTabs = ["all", "review", "receivables", "resolution"] as const;

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
	const [rangeFrom, rangeTo] = dateRange || [];
	const filters = {
		q,
		from: rangeFrom && rangeFrom !== "-" ? rangeFrom : from,
		to: rangeTo && rangeTo !== "-" ? rangeTo : to,
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
