import { expect, test } from "bun:test";
import { planShortLoadInventoryReconciliation } from "./fulfillment-short-load-inventory";

test("retains packed component units and releases only excess inventory", () => {
	expect(
		planShortLoadInventoryReconciliation([
			{
				componentId: 1,
				packedRequirement: 6,
				allocations: [
					{ id: 1, status: "reserved", qty: 2 },
					{ id: 2, status: "picked", qty: 10 },
				],
			},
		]),
	).toEqual({
		releases: [
			{ allocationId: 2, qty: 4, requiresPhysicalReturn: true },
			{ allocationId: 1, qty: 2, requiresPhysicalReturn: false },
		],
		requiresPhysicalReturn: true,
	});
});
test("unused reservations require no physical return when packed stock is covered", () => {
	expect(
		planShortLoadInventoryReconciliation([
			{
				componentId: 1,
				packedRequirement: 2,
				allocations: [
					{ id: 1, status: "picked", qty: 2 },
					{ id: 2, status: "reserved", qty: 3 },
				],
			},
		]).requiresPhysicalReturn,
	).toBe(false);
});
test("does not treat reservations as proof of physical packing", () => {
	expect(() =>
		planShortLoadInventoryReconciliation([
			{
				componentId: 1,
				packedRequirement: 2,
				allocations: [{ id: 1, status: "reserved", qty: 5 }],
			},
		]),
	).toThrow("not fully covered");
	expect(() =>
		planShortLoadInventoryReconciliation([
			{
				componentId: 1,
				packedRequirement: 0,
				allocations: [{ id: 1, status: "consumed", qty: 2 }],
			},
		]),
	).toThrow("consumed");
});
