import { describe, expect, it } from "bun:test";

import {
	canFulfillAllInventoryNeeds,
	getInboundOrderableQty,
	getInventoryInboundEmptyStateCopy,
	getPendingInventoryQty,
	isInventoryNeedRow,
	resolveInventoryInboundCountState,
	shouldShowInventoryNeedsActions,
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

	it("classifies only positive tracked requirements as Needs rows", () => {
		expect(
			isInventoryNeedRow({
				requirementStatus: "required",
				trackingPolicy: "tracked",
			}),
		).toBe(true);
		expect(
			isInventoryNeedRow({
				requirementStatus: "not_applicable",
				trackingPolicy: "tracked",
			}),
		).toBe(false);
		expect(
			isInventoryNeedRow({
				requirementStatus: "required",
				trackingPolicy: "tracked",
				inventoryProductKind: "component",
			}),
		).toBe(false);
	});

	it("gates Mark all needs fulfilled on capability, lifecycle, and pending qty", () => {
		expect(
			canFulfillAllInventoryNeeds({
				canMarkAvailable: true,
				pendingQty: 2,
			}),
		).toBe(true);
		expect(
			canFulfillAllInventoryNeeds({
				canMarkAvailable: true,
				pendingQty: 0,
			}),
		).toBe(false);
		expect(
			canFulfillAllInventoryNeeds({
				canMarkAvailable: true,
				pendingQty: 2,
				isReadOnly: true,
			}),
		).toBe(false);
	});

	it("hides the needs action area when the active Needs segment has no rows", () => {
		expect(
			shouldShowInventoryNeedsActions({
				segment: "stock",
				needCount: 0,
			}),
		).toBe(false);
		expect(
			shouldShowInventoryNeedsActions({
				segment: "stock",
				needCount: 2,
			}),
		).toBe(true);
		expect(
			shouldShowInventoryNeedsActions({
				segment: "non_stock",
				needCount: 2,
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
