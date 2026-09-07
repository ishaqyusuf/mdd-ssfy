import { describe, expect, it } from "bun:test";
import { dispatchCalendarSchema, fulfillmentCalendarSchema } from "./dispatch-workspace";

describe("fulfillmentCalendarSchema", () => {
	it("requires a bounded range for the paginated v2 calendar while retaining filters", () => {
		expect(dispatchCalendarSchema.safeParse({ q: "09592DB" }).success).toBe(false);
		const parsed = dispatchCalendarSchema.parse({ from: "2026-09-01", to: "2026-10-11", q: "09592DB", unscheduled: true });
		expect(parsed.q).toBe("09592DB");
		expect(parsed.unscheduled).toBe(true);
		expect(dispatchCalendarSchema.safeParse({ from: "2026-01-01", to: "2026-12-31" }).success).toBe(false);
	});
	it("accepts a six-week month grid", () => {
		expect(
			fulfillmentCalendarSchema.safeParse({
				from: "2026-07-27",
				to: "2026-09-06",
			}).success,
		).toBe(true);
	});

	it("rejects reversed or unbounded ranges", () => {
		expect(
			fulfillmentCalendarSchema.safeParse({
				from: "2026-08-21",
				to: "2026-08-20",
			}).success,
		).toBe(false);
		expect(
			fulfillmentCalendarSchema.safeParse({
				from: "2026-01-01",
				to: "2026-03-01",
			}).success,
		).toBe(false);
		expect(
			fulfillmentCalendarSchema.safeParse({
				from: "2026-02-31",
				to: "2026-03-02",
			}).success,
		).toBe(false);
	});
});
