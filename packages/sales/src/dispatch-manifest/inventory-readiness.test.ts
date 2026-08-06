import { describe, expect, it } from "bun:test";

import { getDispatchInventoryReadiness } from "./inventory-readiness";

describe("dispatch inventory readiness", () => {
	it("distinguishes ready, reserved, backordered, and review states", () => {
		expect(
			getDispatchInventoryReadiness([
				{ requiredQty: 2, allocations: [{ qty: 2, status: "picked" }] },
			]),
		).toBe("ready_to_load");
		expect(
			getDispatchInventoryReadiness([
				{ requiredQty: 2, allocations: [{ qty: 2, status: "reserved" }] },
			]),
		).toBe("reserved");
		expect(
			getDispatchInventoryReadiness([
				{ requiredQty: 2, allocations: [], inboundQty: 2 },
			]),
		).toBe("backordered");
		expect(
			getDispatchInventoryReadiness([
				{
					requiredQty: 2,
					allocations: [{ qty: 2, status: "pending_review" }],
				},
			]),
		).toBe("inventory_review");
	});
});
