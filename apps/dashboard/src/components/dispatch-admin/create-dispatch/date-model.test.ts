import { describe, expect, it } from "bun:test";
import {
	buildDispatchOrderDates,
	getEffectiveDeliveryDate,
	reconcileOrderDueDates,
} from "./date-model";

describe("create dispatch date model", () => {
	it("preserves individual dates while a batch override is active", () => {
		const orderDueDates = {
			"101": "2026-09-01",
			"102": "2026-09-04",
		};

		expect(getEffectiveDeliveryDate(orderDueDates["101"], "2026-09-08")).toBe(
			"2026-09-08",
		);
		expect(getEffectiveDeliveryDate(orderDueDates["101"], null)).toBe(
			"2026-09-01",
		);
		expect(orderDueDates["102"]).toBe("2026-09-04");
	});

	it("retains existing dates and initializes only newly selected orders", () => {
		expect(
			reconcileOrderDueDates([101, 102], { "101": "2026-09-01" }, "2026-09-10"),
		).toEqual({
			"101": "2026-09-01",
			"102": "2026-09-10",
		});
	});

	it("prefills newly selected orders from their saved delivery due dates", () => {
		expect(
			reconcileOrderDueDates(
				[101, 102],
				{ "101": "2026-09-01" },
				"2026-09-10",
				{ "101": "2026-09-03", "102": "2026-09-04" },
			),
		).toEqual({
			"101": "2026-09-01",
			"102": "2026-09-04",
		});
	});

	it("builds one persisted date per selected order", () => {
		const orders = buildDispatchOrderDates([101, 102], {
			"101": "2026-09-01",
			"102": "2026-09-04",
		});

		expect(orders.map((order) => order.salesId)).toEqual([101, 102]);
		expect(orders.map((order) => order.dueDate.getDate())).toEqual([1, 4]);
	});
});
