import { describe, expect, it } from "bun:test";
import { format } from "date-fns";

import {
	formatOperationsCalendarPeriodLabel,
	getOperationsCalendarPeriodOptions,
	resolveOperationsCalendarDate,
} from "./range";

describe("operations calendar period options", () => {
	it("offers ten weeks before and after the selected week", () => {
		const selectedDate = resolveOperationsCalendarDate("2026-08-21");
		const options = getOperationsCalendarPeriodOptions(selectedDate, "week");

		expect(options).toHaveLength(21);
		expect(options.findIndex((option) => option.selected)).toBe(10);
		const dates = options.map((option) => format(option.date, "yyyy-MM-dd"));
		expect(dates.at(0)).toBe("2026-06-12");
		expect(dates.at(-1)).toBe("2026-10-30");
		expect(formatOperationsCalendarPeriodLabel(selectedDate, "week")).toBe(
			"Aug 17 – Aug 23, 2026",
		);
	});

	it("offers four months before and after the selected month", () => {
		const selectedDate = resolveOperationsCalendarDate("2026-08-21");
		const options = getOperationsCalendarPeriodOptions(selectedDate, "month");

		expect(options).toHaveLength(9);
		expect(options.findIndex((option) => option.selected)).toBe(4);
		expect(options.map((option) => option.label).at(0)).toBe("April 2026");
		expect(options.map((option) => option.label).at(-1)).toBe("December 2026");
		expect(formatOperationsCalendarPeriodLabel(selectedDate, "month")).toBe(
			"August 2026",
		);
	});
});
