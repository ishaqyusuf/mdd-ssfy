import { describe, expect, it } from "bun:test";

import {
	formatSalesTaxCalendarDate,
	getDefaultSalesTaxReportRange,
	isSelectableSalesTaxReportDate,
} from "./sales-tax-report-date";

describe("sales tax report calendar policy", () => {
	it("defaults to the New York month through the current business day", () => {
		const range = getDefaultSalesTaxReportRange(
			new Date("2026-09-01T02:00:00.000Z"),
		);
		expect(formatSalesTaxCalendarDate(range.from)).toBe("2026-08-01");
		expect(formatSalesTaxCalendarDate(range.to)).toBe("2026-08-31");
	});

	it("formats the selected calendar day as the date-only API value", () => {
		expect(formatSalesTaxCalendarDate(new Date(2026, 7, 25))).toBe(
			"2026-08-25",
		);
	});

	it("allows any historical date through today without future dates", () => {
		const now = new Date("2026-08-31T16:00:00.000Z");
		expect(isSelectableSalesTaxReportDate(new Date(2024, 0, 1), now)).toBe(
			true,
		);
		expect(isSelectableSalesTaxReportDate(new Date(2026, 7, 31), now)).toBe(
			true,
		);
		expect(isSelectableSalesTaxReportDate(new Date(2026, 8, 1), now)).toBe(
			false,
		);
	});
});
