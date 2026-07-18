import type { RouterInputs } from "@api/trpc/routers/_app";
import { useQueryStates } from "nuqs";
import {
	createLoader,
	parseAsArrayOf,
	parseAsString,
	parseAsStringEnum,
} from "nuqs/server";

type FilterKeys = keyof Exclude<
	RouterInputs["community"]["getProjectUnits"],
	void
>;

export const projectUnitFilterParams = {
	q: parseAsString,
	builderSlug: parseAsString,
	projectSlug: parseAsString,
	template: parseAsStringEnum(["configured", "not configured"]),
	dateRange: parseAsArrayOf(parseAsString),
	installation: parseAsStringEnum([
		"has installation",
		"no installation",
		"Submitted",
		"No Submission",
	]),
	production: parseAsStringEnum([
		"started",
		"queued",
		"idle",
		"completed",
		"sort",
	]),
	invoice: parseAsStringEnum(["no payment", "has payment"]),
	installCost: parseAsStringEnum([
		"configured",
		"part configured",
		"not configured",
		"has install cost",
		"no install cost",
	]),
} satisfies Partial<Record<FilterKeys, unknown>>;

export function useProjectUnitFilterParams() {
	const [filters, setFilters] = useQueryStates(projectUnitFilterParams);
	return {
		filters,
		setFilters,
		hasFilters: Object.values(filters).some((value) => value !== null),
	};
}
export const loadProjectUnitFilterParams = createLoader(
	projectUnitFilterParams,
);
