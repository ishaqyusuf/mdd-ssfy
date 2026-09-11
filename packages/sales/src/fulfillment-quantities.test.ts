import { describe, expect, test } from "bun:test";
import {
	projectFulfillmentQuantities,
	type FulfillmentQuantityDelivery,
} from "./fulfillment-quantities";
const quantity = (lh: number, rh = 0) => ({ qty: 0, lh, rh });
const line = (lh: number, rh = 0) => ({
	uid: "door-size-1",
	quantity: quantity(lh, rh),
});
const lines = [
	{
		uid: "door-size-1",
		salesItemId: 1,
		size: "3-0 x 6-8",
		ordered: quantity(5, 5),
	},
];
const active = (
	id: number,
	lh: number,
	rh = 0,
): FulfillmentQuantityDelivery => ({
	id,
	state: "active",
	planned: [line(lh, rh)],
	packed: [],
	delivered: [],
});
describe("fulfillment quantity authority", () => {
	test("partial assignment enters backlog before any packing or delivery", () => {
		const result = projectFulfillmentQuantities({
			lines,
			deliveries: [active(1, 3, 2)],
		});
		expect(result.backlogQty).toBe(5);
		expect(result.lines[0]?.availableToAssign).toEqual(quantity(2, 3));
	});
	test("packing is contained in reservation and is not subtracted twice", () => {
		const delivery = { ...active(1, 3, 2), packed: [line(2, 2)] };
		expect(
			projectFulfillmentQuantities({ lines, deliveries: [delivery] })
				.backlogQty,
		).toBe(5);
	});
	test("persisted shortage releases scope exactly once; draft packing does not", () => {
		const delivery = { ...active(1, 2, 2), packed: [line(2, 2)] };
		for (let attempt = 0; attempt < 2; attempt++)
			expect(
				projectFulfillmentQuantities({ lines, deliveries: [delivery] })
					.backlogQty,
			).toBe(6);
	});
	test("delivered quantities and undelivered reservation are counted once", () => {
		const delivery = {
			...active(1, 3, 2),
			packed: [line(3, 2)],
			delivered: [line(1, 1)],
		};
		const result = projectFulfillmentQuantities({
			lines,
			deliveries: [delivery],
		});
		expect(result.lines[0]?.assigned).toEqual(quantity(2, 1));
		expect(result.backlogQty).toBe(5);
	});
	test("completed and cancelled fulfillment reservations do not hold remainder", () => {
		const completed: FulfillmentQuantityDelivery = {
			...active(1, 3, 2),
			state: "completed",
			delivered: [line(3, 2)],
		};
		const cancelled: FulfillmentQuantityDelivery = {
			...active(2, 2, 3),
			state: "cancelled",
		};
		expect(
			projectFulfillmentQuantities({
				lines,
				deliveries: [completed, cancelled],
			}).backlogQty,
		).toBe(5);
	});
	test("editing releases only current reservation and never delivered quantity", () => {
		const current = { ...active(1, 3, 2), delivered: [line(1)] };
		const result = projectFulfillmentQuantities({
			lines,
			deliveries: [current, active(2, 2, 3)],
			excludeDeliveryId: 1,
		});
		expect(result.lines[0]?.availableToAssign).toEqual(quantity(2, 2));
	});
	test("legacy ambiguity cannot silently free stock", () => {
		const result = projectFulfillmentQuantities({
			lines,
			deliveries: [{ ...active(1, 0), planned: null }],
		});
		expect(result.resolved).toBe(false);
		expect(result.backlogQty).toBe(0);
		expect(result.conflicts[0]?.code).toBe("LEGACY_SCOPE_UNKNOWN");
	});
	test("handed oversubscription blocks even when scalar total would fit", () => {
		const result = projectFulfillmentQuantities({
			lines,
			deliveries: [active(1, 4), active(2, 2)],
		});
		expect(result.resolved).toBe(false);
		expect(result.backlogQty).toBe(0);
	});
	test("packing beyond plan is a conflict", () => {
		const result = projectFulfillmentQuantities({
			lines,
			deliveries: [{ ...active(1, 1), packed: [line(2)] }],
		});
		expect(result.conflicts[0]?.code).toBe("PHYSICAL_EXCEEDS_PLAN");
	});
	test("scalar quantities preserve sales-line identity", () => {
		const result = projectFulfillmentQuantities({
			lines: [
				{
					uid: "trim",
					salesItemId: 2,
					size: null,
					ordered: { qty: 25, lh: 0, rh: 0 },
				},
			],
			deliveries: [],
		});
		expect(result.backlogQty).toBe(0);
		expect(result.lines[0]?.availableToAssign.qty).toBe(25);
		expect(result.lines[0]?.salesItemId).toBe(2);
	});
});
