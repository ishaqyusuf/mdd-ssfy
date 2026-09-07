import { describe, expect, it } from "bun:test";
import { format } from "date-fns";
import {
	getFulfillmentCalendarPeriod,
	moveFulfillmentCalendarDate,
	resolveFulfillmentCalendarDate,
} from "./fulfillment-calendar-range";

describe("fulfillment calendar range", () => {
	it("keeps complete weeks when a month crosses a year boundary", () => {
		const date = resolveFulfillmentCalendarDate("2026-12-31");
		const next = moveFulfillmentCalendarDate(date, "month", 1);
		expect(format(next, "yyyy-MM-dd")).toBe("2027-01-31");
		const period = getFulfillmentCalendarPeriod(next, "month");
		expect(period.from).toBe("2026-12-28");
		expect(period.to).toBe("2027-01-31");
	});
	it("builds a Monday-to-Sunday week", () => {
		const period = getFulfillmentCalendarPeriod(
			resolveFulfillmentCalendarDate("2026-08-21"),
			"week",
		);

		expect(period.from).toBe("2026-08-17");
		expect(period.to).toBe("2026-08-23");
		expect(period.days).toHaveLength(7);
	});

	it("pads a month to complete calendar weeks", () => {
		const period = getFulfillmentCalendarPeriod(
			resolveFulfillmentCalendarDate("2026-08-21"),
			"month",
		);

		expect(period.from).toBe("2026-07-27");
		expect(period.to).toBe("2026-09-06");
		expect(period.days).toHaveLength(42);
	});

	it("moves by the active view period", () => {
		const date = resolveFulfillmentCalendarDate("2026-08-21");

		expect(format(moveFulfillmentCalendarDate(date, "week", 1), "yyyy-MM-dd")).toBe(
			"2026-08-28",
		);
		expect(format(moveFulfillmentCalendarDate(date, "month", -1), "yyyy-MM-dd")).toBe(
			"2026-07-21",
		);
	});
});
