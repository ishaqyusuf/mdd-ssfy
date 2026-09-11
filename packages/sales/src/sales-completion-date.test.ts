import { expect, test } from "bun:test";
import { assertSalesCompletionDate, getSalesCompletionDateContext } from "./sales-completion-date";

test("defaults completion to the business day, not browser or UTC day", () => {
	expect(getSalesCompletionDateContext(new Date("2026-09-08T02:00:00Z"), "America/New_York")).toEqual({ today: "2026-09-07", timeZone: "America/New_York" });
	expect(getSalesCompletionDateContext(new Date("2026-09-08T02:00:00Z"), "Africa/Lagos")).toEqual({ today: "2026-09-08", timeZone: "Africa/Lagos" });
	expect(getSalesCompletionDateContext(new Date("2026-11-01T04:00:00Z"), "America/New_York").today).toBe("2026-11-01");
});

test("completion rejects the next business day across the UTC boundary", () => {
	const now = new Date("2026-09-08T02:00:00Z");
	expect(() => assertSalesCompletionDate(new Date("2026-09-08T05:00:00Z"), now, "America/New_York")).toThrow("after today");
	expect(() => assertSalesCompletionDate(new Date("2026-09-08T03:00:00Z"), now, "America/New_York")).not.toThrow();
	expect(() => assertSalesCompletionDate(new Date("2026-09-07T12:00:00Z"), now, "America/New_York")).not.toThrow();
	expect(() => assertSalesCompletionDate(new Date("invalid"), now)).toThrow("valid delivery date");
});
