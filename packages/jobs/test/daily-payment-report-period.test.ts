import { describe, expect, it } from "bun:test";
import { resolveDailyPaymentsReportPeriod } from "../src/tasks/sales/daily-payment-report-period";

describe("resolveDailyPaymentsReportPeriod", () => {
	const timezone = "America/New_York";
	const now = new Date("2026-05-14T12:00:00.000Z");

	it("resolves today's local calendar day by default", () => {
		const period = resolveDailyPaymentsReportPeriod({
			now,
			timezone,
			reportWindow: "today",
		});

		expect(period.reportDate).toBe("2026-05-14");
		expect(period.from.toISOString()).toBe("2026-05-14T04:00:00.000Z");
		expect(period.to.toISOString()).toBe("2026-05-15T03:59:59.000Z");
		expect(period.isExplicitRange).toBe(false);
	});

	it("resolves the previous local calendar day", () => {
		const period = resolveDailyPaymentsReportPeriod({
			now,
			timezone,
			reportWindow: "previous_day",
		});

		expect(period.reportDate).toBe("2026-05-13");
		expect(period.from.toISOString()).toBe("2026-05-13T04:00:00.000Z");
		expect(period.to.toISOString()).toBe("2026-05-14T03:59:59.000Z");
		expect(period.isExplicitRange).toBe(false);
	});

	it("resolves an explicit single date as a full local calendar day", () => {
		const period = resolveDailyPaymentsReportPeriod({
			now,
			timezone,
			reportWindow: "today",
			dateFrom: "2026-05-01",
			dateTo: "2026-05-01",
		});

		expect(period.reportDate).toBe("2026-05-01");
		expect(period.from.toISOString()).toBe("2026-05-01T04:00:00.000Z");
		expect(period.to.toISOString()).toBe("2026-05-02T03:59:59.000Z");
		expect(period.isExplicitRange).toBe(true);
	});

	it("resolves an explicit date range as full local calendar days", () => {
		const period = resolveDailyPaymentsReportPeriod({
			now,
			timezone,
			reportWindow: "today",
			dateFrom: "2026-05-01",
			dateTo: "2026-05-14",
		});

		expect(period.reportDate).toBe("2026-05-01-to-2026-05-14");
		expect(period.from.toISOString()).toBe("2026-05-01T04:00:00.000Z");
		expect(period.to.toISOString()).toBe("2026-05-15T03:59:59.000Z");
		expect(period.isExplicitRange).toBe(true);
	});

	it("rejects a reversed explicit range", () => {
		expect(() =>
			resolveDailyPaymentsReportPeriod({
				now,
				timezone,
				reportWindow: "today",
				dateFrom: "2026-05-14",
				dateTo: "2026-05-01",
			}),
		).toThrow("dateTo cannot be before dateFrom");
	});
});
