import { describe, expect, it } from "bun:test";

import {
	createDatePresetSelection,
	getCalendarFilterDateValue,
} from "./date-filter-selection";

describe("Midday date filter selection", () => {
	it("serializes a cutoff preset as the shared one-element filter value", () => {
		expect(createDatePresetSelection("before last 3 months")).toEqual([
			"before last 3 months",
		]);
	});

	it("maps cutoff presets to an upper calendar bound only", () => {
		const filterValue = createDatePresetSelection("before last 3 months");

		expect(getCalendarFilterDateValue(filterValue, 0)).toBeUndefined();
		expect(getCalendarFilterDateValue(filterValue, 1)).toBeInstanceOf(Date);
	});
});
