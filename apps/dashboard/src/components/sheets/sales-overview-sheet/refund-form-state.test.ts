import { describe, expect, test } from "bun:test";
import { syncSingleOrderPrincipalAllocation } from "./refund-form-state";

describe("refund form allocation state", () => {
	test("keeps a single-order allocation synchronized with a partial principal", () => {
		expect(
			syncSingleOrderPrincipalAllocation({
				allocations: { 23521: "24.60" },
				eligibleOrderIds: [23521],
				principal: "4.00",
				salesOrderId: 23521,
			}),
		).toEqual({ 23521: "4.00" });
	});

	test("uses the current sale when a historical tender has no legacy order rows", () => {
		expect(
			syncSingleOrderPrincipalAllocation({
				allocations: { 23521: "24.60" },
				eligibleOrderIds: [],
				principal: "4.00",
				salesOrderId: 23521,
			}),
		).toEqual({ 23521: "4.00" });
	});

	test("preserves explicit allocations for multi-order tenders", () => {
		const allocations = { 10: "15.00", 11: "5.00" };
		expect(
			syncSingleOrderPrincipalAllocation({
				allocations,
				eligibleOrderIds: [10, 11],
				principal: "19.00",
				salesOrderId: 10,
			}),
		).toBe(allocations);
	});
});
