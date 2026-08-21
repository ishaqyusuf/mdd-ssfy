import { describe, expect, it } from "bun:test";
import { fulfillmentCalendarSchema } from "./dispatch-workspace";

describe("fulfillmentCalendarSchema", () => {
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
