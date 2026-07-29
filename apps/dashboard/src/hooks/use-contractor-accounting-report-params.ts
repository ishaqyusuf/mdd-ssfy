import type { RouterInputs } from "@api/trpc/routers/_app";
import { formatDateOnlyInTimezone } from "@gnd/contractor-accounting";
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

type Input = RouterInputs["jobs"]["contractorPeriodReport"];

export const contractorAccountingReportParams = {
	from: parseAsString,
	to: parseAsString,
	timezone: parseAsString,
} satisfies Partial<Record<keyof Input, unknown>>;

export function getDefaultContractorAccountingReportPeriod(now = new Date()) {
	const timezone = "America/New_York";
	const today = formatDateOnlyInTimezone(now, timezone);
	const year = today.slice(0, 4);
	return {
		from: `${year}-01-01`,
		to: today,
		timezone,
	};
}

export function useContractorAccountingReportParams() {
	const [filters, setFilters] = useQueryStates(
		contractorAccountingReportParams,
	);
	const defaults = getDefaultContractorAccountingReportPeriod();
	return {
		filters: {
			from: filters.from || defaults.from,
			to: filters.to || defaults.to,
			timezone: filters.timezone || defaults.timezone,
		},
		setFilters,
	};
}

export const loadContractorAccountingReportParams = createLoader(
	contractorAccountingReportParams,
);
