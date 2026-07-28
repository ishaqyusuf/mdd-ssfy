import { type DateFilterInput, transformFilterDateToQuery } from "@gnd/utils";
import type { DaysFilters } from "@gnd/utils/constants";

export type DatePresetSelection = [DaysFilters];

export function createDatePresetSelection(
	preset: DaysFilters,
): DatePresetSelection {
	return [preset];
}

export function getCalendarFilterDateValue(
	filterValue: DateFilterInput,
	index: 0 | 1,
): Date | undefined {
	if (!Array.isArray(filterValue) || filterValue.length === 0) return undefined;

	if (
		index === 1 &&
		(filterValue[0] === "today" || filterValue[0] === "yesterday")
	) {
		return undefined;
	}

	const range = transformFilterDateToQuery(filterValue);
	const value = index === 0 ? range?.gte : range?.lte;

	return value ? new Date(value) : undefined;
}
