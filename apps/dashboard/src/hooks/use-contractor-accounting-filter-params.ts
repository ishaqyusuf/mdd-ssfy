"use client";

import { formatDateOnlyInTimezone } from "@gnd/contractor-accounting";
import { useQueryStates } from "nuqs";
import {
	createLoader,
	parseAsArrayOf,
	parseAsBoolean,
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
} from "nuqs/server";

const amountBands = ["under-500", "500-2500", "over-2500"] as const;
const accountingTabs = ["ledger", "payables", "review", "resolution"] as const;

export const contractorAccountingFilterParams = {
	q: parseAsString,
	dateRange: parseAsArrayOf(parseAsString),
	from: parseAsString,
	to: parseAsString,
	timezone: parseAsString,
	contractorIds: parseAsArrayOf(parseAsInteger),
	entryTypes: parseAsArrayOf(parseAsString),
	sourceTypes: parseAsArrayOf(parseAsString),
	amountBand: parseAsStringLiteral(amountBands),
	exceptionsOnly: parseAsBoolean,
	tab: parseAsStringLiteral(accountingTabs).withDefault("ledger"),
	entryId: parseAsString,
	contractorId: parseAsInteger,
	issueId: parseAsString,
	createAdjustment: parseAsBoolean,
	manageAccounting: parseAsBoolean,
	managePayoutRuns: parseAsBoolean,
	manageAlerts: parseAsBoolean,
} as const;

export const contractorAccountingSearchFilterParams = {
	q: contractorAccountingFilterParams.q,
	dateRange: contractorAccountingFilterParams.dateRange,
	contractorIds: contractorAccountingFilterParams.contractorIds,
	entryTypes: contractorAccountingFilterParams.entryTypes,
	sourceTypes: contractorAccountingFilterParams.sourceTypes,
	amountBand: contractorAccountingFilterParams.amountBand,
	exceptionsOnly: contractorAccountingFilterParams.exceptionsOnly,
};

export function getDefaultContractorAccountingPeriod(now = new Date()) {
	const timezone = "America/New_York";
	const today = formatDateOnlyInTimezone(now, timezone);
	return {
		from: `${today.slice(0, 4)}-01-01`,
		to: today,
		timezone,
	};
}

function amountRange(amountBand: (typeof amountBands)[number] | null) {
	switch (amountBand) {
		case "under-500":
			return { amountMax: 499.99 };
		case "500-2500":
			return { amountMin: 500, amountMax: 2500 };
		case "over-2500":
			return { amountMin: 2500.01 };
		default:
			return {};
	}
}

export function toContractorAccountingFilters(
	params: ReturnType<typeof useContractorAccountingParams>[0],
) {
	const defaults = getDefaultContractorAccountingPeriod();
	const [rangeFrom, rangeTo] = params.dateRange ?? [];
	return {
		q: params.q ?? undefined,
		from:
			rangeFrom && rangeFrom !== "-" ? rangeFrom : params.from || defaults.from,
		to: rangeTo && rangeTo !== "-" ? rangeTo : params.to || defaults.to,
		timezone: params.timezone || defaults.timezone,
		contractorIds: params.contractorIds?.length
			? params.contractorIds
			: undefined,
		entryTypes: params.entryTypes?.length ? params.entryTypes : undefined,
		sourceTypes: params.sourceTypes?.length ? params.sourceTypes : undefined,
		exceptionsOnly: params.exceptionsOnly || undefined,
		...amountRange(params.amountBand),
	};
}

function useContractorAccountingParams() {
	return useQueryStates(contractorAccountingFilterParams, {
		shallow: false,
	});
}

export function useContractorAccountingFilterParams() {
	const [params, setParams] = useContractorAccountingParams();
	const filters = toContractorAccountingFilters(params);
	const hasFilters = Boolean(
		params.q ||
			params.dateRange?.length ||
			params.from ||
			params.to ||
			params.contractorIds?.length ||
			params.entryTypes?.length ||
			params.sourceTypes?.length ||
			params.amountBand ||
			params.exceptionsOnly,
	);

	return { params, filters, setParams, hasFilters };
}

export const loadContractorAccountingFilterParams = createLoader(
	contractorAccountingFilterParams,
);
