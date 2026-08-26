import { describe, expect, it } from "bun:test";

import {
	formatSalesTaxCalendarDate,
	getInitialSalesTaxReportMonth,
	getSalesTaxReportStartDate,
	isSelectableSalesTaxReportEndDate,
} from "./sales-tax-report-date";

describe("sales tax report calendar policy", () => {
	it("opens the current month after its 25th and the previous month before it", () => {
		expect(
			formatSalesTaxCalendarDate(
				getInitialSalesTaxReportMonth(new Date("2026-08-25T16:00:00.000Z")),
			),
		).toBe("2026-08-01");
		expect(
			formatSalesTaxCalendarDate(
				getInitialSalesTaxReportMonth(new Date("2026-08-24T16:00:00.000Z")),
			),
		).toBe("2026-07-01");
	});

	it("derives the first of the selected end-date month", () => {
		expect(
			formatSalesTaxCalendarDate(
				getSalesTaxReportStartDate(new Date(2026, 6, 31)),
			),
		).toBe("2026-07-01");
	});

	it("formats the selected calendar day as the date-only API value", () => {
		expect(formatSalesTaxCalendarDate(new Date(2026, 7, 25))).toBe(
			"2026-08-25",
		);
	});

	it("allows the 25th through the actual month end without future dates", () => {
		const now = new Date("2026-08-31T16:00:00.000Z");
		expect(isSelectableSalesTaxReportEndDate(new Date(2026, 7, 24), now)).toBe(
			false,
		);
		expect(isSelectableSalesTaxReportEndDate(new Date(2026, 7, 25), now)).toBe(
			true,
		);
		expect(isSelectableSalesTaxReportEndDate(new Date(2026, 7, 31), now)).toBe(
			true,
		);
		expect(isSelectableSalesTaxReportEndDate(new Date(2026, 8, 25), now)).toBe(
			false,
		);
	});
});
