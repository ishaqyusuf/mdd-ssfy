import { describe, expect, it } from "bun:test";
import { getNextContractorAccountingReportRun } from "./schedule-next-run";

describe("contractor accounting report schedules", () => {
	it("computes the next run in the schedule timezone", () => {
		const next = getNextContractorAccountingReportRun({
			cron: "0 8 1 * *",
			timezone: "America/New_York",
			after: new Date("2026-07-29T12:00:00.000Z"),
		});
		expect(next.toISOString()).toBe("2026-08-01T12:00:00.000Z");
	});
});
