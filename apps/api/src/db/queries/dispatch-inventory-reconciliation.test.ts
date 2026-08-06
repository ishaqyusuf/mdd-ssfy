import { describe, expect, test } from "bun:test";

import { classifyDispatchAllocationIssue } from "./dispatch-inventory-reconciliation";

describe("classifyDispatchAllocationIssue", () => {
	test("detects cross-sale, cancelled, completed, and early-consumption drift", () => {
		expect(
			classifyDispatchAllocationIssue({
				allocationStatus: "reserved",
				allocationSaleId: 2,
				dispatchSaleId: 1,
				dispatchStatus: "packed",
				dispatchDeleted: false,
			}),
		).toBe("cross_sale_binding");
		expect(
			classifyDispatchAllocationIssue({
				allocationStatus: "picked",
				allocationSaleId: 1,
				dispatchSaleId: 1,
				dispatchStatus: "cancelled",
				dispatchDeleted: false,
			}),
		).toBe("cancelled_dispatch_holds_stock");
		expect(
			classifyDispatchAllocationIssue({
				allocationStatus: "reserved",
				allocationSaleId: 1,
				dispatchSaleId: 1,
				dispatchStatus: "completed",
				dispatchDeleted: false,
			}),
		).toBe("completed_dispatch_not_consumed");
		expect(
			classifyDispatchAllocationIssue({
				allocationStatus: "consumed",
				allocationSaleId: 1,
				dispatchSaleId: 1,
				dispatchStatus: "in progress",
				dispatchDeleted: false,
			}),
		).toBe("inventory_consumed_before_completion");
	});
});
