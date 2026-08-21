import { describe, expect, it } from "bun:test";
import {
	canSetSalesPaymentDate,
	getSalesPaymentBusinessDate,
	isValidSalesPaymentDate,
	resolveSalesPaymentOccurrence,
} from "./payment-date";

describe("sales payment date", () => {
	it("allows only an exact Super Admin role to select a payment date", () => {
		expect(canSetSalesPaymentDate(["Sales", "Super Admin"])).toBe(true);
		expect(canSetSalesPaymentDate(["super admin"])).toBe(true);
		expect(canSetSalesPaymentDate(["Admin", "Sales"])).toBe(false);
		expect(canSetSalesPaymentDate(["Super Administrator"])).toBe(false);
	});

	it("defaults an omitted date to the current New York business date", () => {
		const now = new Date("2026-08-22T02:30:00.000Z");
		const result = resolveSalesPaymentOccurrence({ now });

		expect(result.paymentDate).toBe("2026-08-21");
		expect(result.occurredAt).toEqual(now);
		expect(result.source).toBe("recorded_now");
	});

	it("moves the current business clock time onto a selected past date", () => {
		const now = new Date("2026-08-21T18:42:15.000Z");
		const result = resolveSalesPaymentOccurrence({
			now,
			paymentDate: "2026-08-14",
		});

		expect(result.paymentDate).toBe("2026-08-14");
		expect(result.occurredAt.toISOString()).toBe("2026-08-14T18:42:15.000Z");
		expect(result.recordedAt).toEqual(now);
		expect(result.source).toBe("staff_selected_date");
	});

	it("rejects future and invalid calendar dates", () => {
		const now = new Date("2026-08-21T18:42:15.000Z");
		expect(() =>
			resolveSalesPaymentOccurrence({ now, paymentDate: "2026-08-22" }),
		).toThrow("Payment date cannot be in the future.");
		expect(isValidSalesPaymentDate("2026-02-29")).toBe(false);
		expect(isValidSalesPaymentDate("2026-08-14")).toBe(true);
	});

	it("keeps the selected date stable across daylight-saving offsets", () => {
		const now = new Date("2026-11-10T15:30:00.000Z");
		const result = resolveSalesPaymentOccurrence({
			now,
			paymentDate: "2026-07-10",
		});

		expect(getSalesPaymentBusinessDate(result.occurredAt)).toBe("2026-07-10");
		expect(result.occurredAt.toISOString()).toBe("2026-07-10T14:30:00.000Z");
	});
});
