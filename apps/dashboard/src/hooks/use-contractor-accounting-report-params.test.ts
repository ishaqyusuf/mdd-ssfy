import { describe, expect, it } from "bun:test";
import { getDefaultContractorAccountingReportPeriod } from "./use-contractor-accounting-report-params";

describe("contractor accounting default period", () => {
	it("uses the New York business date instead of the UTC date", () => {
		expect(
			getDefaultContractorAccountingReportPeriod(
				new Date("2026-01-01T01:00:00.000Z"),
			),
		).toEqual({
			from: "2025-01-01",
			to: "2025-12-31",
			timezone: "America/New_York",
		});
	});
});
