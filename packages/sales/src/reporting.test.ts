import { describe, expect, it } from "bun:test";

import {
	calculateReportingChange,
	formatSalesReportingDate,
	getPreviousSalesReportingPeriod,
	getSalesReportingGranularity,
	resolveSalesReportingPeriod,
} from "./reporting";

describe("sales reporting periods", () => {
	it("uses inclusive date-only boundaries", () => {
		const period = resolveSalesReportingPeriod({
			from: "2026-07-01",
			to: "2026-07-01",
		});

		expect(formatSalesReportingDate(period.from)).toBe("2026-07-01");
		expect(formatSalesReportingDate(period.to)).toBe("2026-07-01");
		expect(period.from.getHours()).toBe(0);
		expect(period.to.getHours()).toBe(23);
	});

	it("builds a preceding comparison period of equal length", () => {
		const period = getPreviousSalesReportingPeriod({
			from: "2026-07-08",
			to: "2026-07-14",
		});

		expect(formatSalesReportingDate(period.from)).toBe("2026-07-01");
		expect(formatSalesReportingDate(period.to)).toBe("2026-07-07");
	});

	it("chooses a readable granularity for longer ranges", () => {
		expect(
			getSalesReportingGranularity({
				from: "2026-07-01",
				to: "2026-07-30",
			}),
		).toBe("day");
		expect(
			getSalesReportingGranularity({
				from: "2026-01-01",
				to: "2026-04-30",
			}),
		).toBe("week");
		expect(
			getSalesReportingGranularity({
				from: "2025-01-01",
				to: "2026-07-30",
			}),
		).toBe("month");
	});

	it("does not invent a percentage when the baseline is zero", () => {
		expect(calculateReportingChange(100, 0)).toBeNull();
		expect(calculateReportingChange(0, 0)).toBe(0);
		expect(calculateReportingChange(120, 100)).toBe(20);
	});
});
