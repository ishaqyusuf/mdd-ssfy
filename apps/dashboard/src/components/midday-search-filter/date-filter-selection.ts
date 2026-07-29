import { type DateFilterInput, transformFilterDateToQuery } from "@gnd/utils";
import type { DaysFilters } from "@gnd/utils/constants";

export type DatePresetSelection = [DaysFilters];

const DATE_PRESET_LABELS = {
	yesterday: "Yesterday",
	today: "Today",
	"this week": "This week",
	"last week": "Last week",
	"this month": "This month",
	"last month": "Last month",
	"last 2 months": "Last 2 months",
	"last 3 months": "Last 3 months",
	"last 6 months": "Last 6 months",
	"before last month": "Over a month",
	"before last 3 months": "Over 3 months",
	"before last 6 months": "Over 6 months",
} satisfies Record<DaysFilters, string>;

export function getDatePresetLabel(value: string): string {
	return DATE_PRESET_LABELS[value as DaysFilters] ?? value;
}

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
