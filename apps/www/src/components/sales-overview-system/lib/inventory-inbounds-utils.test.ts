import { describe, expect, it } from "bun:test";

import {
	canMarkAllInventoryAvailable,
	getInboundOrderableQty,
	getInventoryInboundEmptyStateCopy,
	getPendingInventoryQty,
	resolveInventoryInboundCountState,
} from "./inventory-inbounds-utils";

describe("sales overview inventory inbound helpers", () => {
	it("clamps orderable inbound quantity after open linked demand", () => {
		expect(
			getInboundOrderableQty({ qtyPending: 8, qtyInboundLinkedOpen: 3 }),
		).toBe(5);
		expect(
			getInboundOrderableQty({ qtyPending: 2, qtyInboundLinkedOpen: 4 }),
		).toBe(0);
	});

	it("counts only tracked inventory rows as pending stock", () => {
		expect(
			getPendingInventoryQty([
				{ trackingPolicy: "tracked", qtyPending: 3 },
				{ trackingPolicy: "untracked", qtyPending: 10 },
				{
					trackingPolicy: "tracked",
					inventoryProductKind: "component",
					qtyPending: 4,
				},
			]),
		).toBe(3);
	});

	it("gates Mark all available on capability, lifecycle, and pending qty", () => {
		expect(
			canMarkAllInventoryAvailable({
				canMarkAvailable: true,
				pendingQty: 2,
			}),
		).toBe(true);
		expect(
			canMarkAllInventoryAvailable({
				canMarkAvailable: true,
				pendingQty: 0,
			}),
		).toBe(false);
		expect(
			canMarkAllInventoryAvailable({
				canMarkAvailable: true,
				pendingQty: 2,
				isReadOnly: true,
			}),
		).toBe(false);
	});

	it("keeps inbound count loading separate from empty state", () => {
		expect(
			resolveInventoryInboundCountState({
				isLoading: true,
				pendingQty: 4,
			}),
		).toBe("loading");
		expect(
			resolveInventoryInboundCountState({
				isLoading: false,
				shipmentCount: 1,
				pendingQty: 0,
			}),
		).toBe("pending");
		expect(getInventoryInboundEmptyStateCopy({ pendingQty: 4 }).title).toBe(
			"4 inventory still needed",
		);
	});
});
