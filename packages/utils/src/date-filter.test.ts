import { afterAll, describe, expect, it, setSystemTime } from "bun:test";

import { daysFilters } from "./constants";
import dayjs from "./dayjs";
import { getCompleteMonthDateQuery, transformFilterDateToQuery } from "./index";

function formatRange(
	range: ReturnType<typeof transformFilterDateToQuery>,
): Record<string, string> | null | undefined {
	if (!range) return range;

	return Object.fromEntries(
		Object.entries(range).map(([key, value]) => [
			key,
			dayjs(value).format("YYYY-MM-DD HH:mm:ss.SSS"),
		]),
	);
}

describe("transformFilterDateToQuery month presets", () => {
	afterAll(() => {
		setSystemTime();
	});

	it("resolves the last three complete calendar months", () => {
		setSystemTime(new Date(2026, 6, 28, 12));

		expect(formatRange(transformFilterDateToQuery(["last 3 months"]))).toEqual({
			gte: "2026-04-01 00:00:00.000",
			lte: "2026-06-30 23:59:59.999",
		});
	});

	it("resolves dates before the last three complete calendar months", () => {
		setSystemTime(new Date(2026, 6, 28, 12));

		expect(
			formatRange(transformFilterDateToQuery(["before last 3 months"])),
		).toEqual({
			lte: "2026-03-31 23:59:59.999",
		});
	});

	it("supports the singular before-last-month label", () => {
		setSystemTime(new Date(2026, 6, 28, 12));

		expect(
			formatRange(transformFilterDateToQuery(["before last month"])),
		).toEqual({
			lte: "2026-05-31 23:59:59.999",
		});
	});

	it("preserves legacy singular and plural recent-month aliases", () => {
		setSystemTime(new Date(2026, 6, 28, 12));

		const expected = {
			gte: "2026-05-01 00:00:00.000",
			lte: "2026-06-30 23:59:59.999",
		};

		expect(formatRange(transformFilterDateToQuery(["last 2 month"]))).toEqual(
			expected,
		);
		expect(formatRange(transformFilterDateToQuery(["last 2 months"]))).toEqual(
			expected,
		);
	});

	it("preserves last-month and six-month aliases", () => {
		setSystemTime(new Date(2026, 6, 28, 12));

		expect(formatRange(transformFilterDateToQuery(["last month"]))).toEqual({
			gte: "2026-06-01 00:00:00.000",
			lte: "2026-06-30 23:59:59.999",
		});

		const expectedSixMonths = {
			gte: "2026-01-01 00:00:00.000",
			lte: "2026-06-30 23:59:59.999",
		};
		expect(formatRange(transformFilterDateToQuery(["last 6 month"]))).toEqual(
			expectedSixMonths,
		);
		expect(formatRange(transformFilterDateToQuery(["last 6 months"]))).toEqual(
			expectedSixMonths,
		);
	});

	it("supports six-month cutoffs with case and whitespace normalization", () => {
		setSystemTime(new Date(2026, 6, 28, 12));

		expect(
			formatRange(transformFilterDateToQuery([" BEFORE LAST 6 MONTHS "])),
		).toEqual({
			lte: "2025-12-31 23:59:59.999",
		});
	});

	it("handles year rollover for complete-month ranges", () => {
		setSystemTime(new Date(2026, 0, 15, 12));

		expect(formatRange(transformFilterDateToQuery(["last 3 months"]))).toEqual({
			gte: "2025-10-01 00:00:00.000",
			lte: "2025-12-31 23:59:59.999",
		});
	});

	it("includes leap-year February as a complete calendar month", () => {
		setSystemTime(new Date(2024, 3, 10, 12));

		expect(formatRange(transformFilterDateToQuery(["last 2 months"]))).toEqual({
			gte: "2024-02-01 00:00:00.000",
			lte: "2024-03-31 23:59:59.999",
		});
	});

	it("keeps explicit ranges and string inputs compatible", () => {
		setSystemTime(new Date(2026, 6, 28, 12));

		expect(formatRange(transformFilterDateToQuery(["2026-02-01"]))).toEqual({
			gte: "2026-02-01 00:00:00.000",
		});
		expect(
			formatRange(transformFilterDateToQuery(["2026-02-01", "2026-02-14"])),
		).toEqual({
			gte: "2026-02-01 00:00:00.000",
			lte: "2026-02-14 00:00:00.000",
		});
		expect(formatRange(transformFilterDateToQuery("today"))).toEqual({
			gte: "2026-07-28 00:00:00.000",
			lte: "2026-07-28 23:59:59.999",
		});
	});

	it("rejects malformed month counts and invalid dates safely", () => {
		expect(getCompleteMonthDateQuery(0, "last")).toBeNull();
		expect(getCompleteMonthDateQuery(1.5, "before")).toBeNull();
		expect(transformFilterDateToQuery(["last 0 months"])).toBeNull();
		expect(transformFilterDateToQuery(["not-a-date"])).toBeNull();
		expect(transformFilterDateToQuery([])).toBeUndefined();
		expect(transformFilterDateToQuery(undefined)).toBeUndefined();
	});
});

describe("shared month filter presets", () => {
	it("offers recent and cutoff filters for one, three, and six months", () => {
		expect(daysFilters).toContain("last month");
		expect(daysFilters).toContain("last 3 months");
		expect(daysFilters).toContain("last 6 months");
		expect(daysFilters).toContain("before last month");
		expect(daysFilters).toContain("before last 3 months");
		expect(daysFilters).toContain("before last 6 months");
	});
});
