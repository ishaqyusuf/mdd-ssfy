import { describe, expect, it } from "bun:test";
import { runTaskEventNowInputSchema } from "./task-events.route";

describe("taskEvents.runNow input", () => {
	it("accepts an optional one-off filter payload", () => {
		const input = runTaskEventNowInputSchema.parse({
			eventName: "sales-daily-payment-report-schedule",
			filter: {
				dateFrom: "2026-05-01",
				dateTo: "2026-05-14",
				timezone: "America/New_York",
				notificationChannelName: "sales_daily_payment_report",
			},
		});

		expect(input.filter?.dateFrom).toBe("2026-05-01");
		expect(input.filter?.dateTo).toBe("2026-05-14");
	});
});
