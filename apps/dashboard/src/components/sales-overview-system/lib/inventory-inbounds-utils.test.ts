import { describe, expect, it } from "bun:test";

import {
	areAllInventoryNeedsFulfilled,
	canFulfillAllInventoryNeeds,
	getInboundOrderableQty,
	getInventoryInboundEmptyStateCopy,
	getPendingInventoryQty,
	isInventoryNeedRow,
	resolveInventoryAvailabilityState,
	resolveInventoryInboundCountState,
	shouldAutoSyncSalesInventory,
	shouldShowInventoryInboundForm,
	shouldShowInventoryNeedsActions,
} from "./inventory-inbounds-utils";

describe("sales overview inventory inbound helpers", () => {
	it("uses availability as the single stock coverage signal", () => {
		expect(
			resolveInventoryAvailabilityState({ qtyAllocated: 0, qtyRequired: 4 }),
		).toBe("empty");
		expect(
			resolveInventoryAvailabilityState({ qtyAllocated: 2, qtyRequired: 4 }),
		).toBe("partial");
		expect(
			resolveInventoryAvailabilityState({ qtyAllocated: 4, qtyRequired: 4 }),
		).toBe("complete");
	});

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

	it("auto-syncs only repairable unsynchronized inventory once per page session", () => {
		const base = {
			salesOrderId: 42,
			canManualSync: true,
			canSync: true,
			hasAttempted: false,
		};

		expect(
			shouldAutoSyncSalesInventory({
				...base,
				applicabilityState: "not_synced",
			}),
		).toBe(true);
		expect(
			shouldAutoSyncSalesInventory({
				...base,
				applicabilityState: "failed",
			}),
		).toBe(true);
		expect(
			shouldAutoSyncSalesInventory({
				...base,
				applicabilityState: "applicable",
			}),
		).toBe(false);
		expect(
			shouldAutoSyncSalesInventory({
				...base,
				applicabilityState: "not_synced",
				hasAttempted: true,
			}),
		).toBe(false);
		expect(
			shouldAutoSyncSalesInventory({
				...base,
				applicabilityState: "not_synced",
				canSync: false,
			}),
		).toBe(false);
	});

	it("does not open an inbound form when fulfilled needs have no pending work", () => {
		expect(
			shouldShowInventoryInboundForm({
				isOpen: true,
				canCreateInbound: true,
				inboundRowCount: 0,
				pendingQty: 0,
			}),
		).toBe(false);
		expect(
			shouldShowInventoryInboundForm({
				isOpen: true,
				canCreateInbound: true,
				inboundRowCount: 2,
				pendingQty: 2,
			}),
		).toBe(true);
		expect(
			shouldShowInventoryInboundForm({
				isOpen: false,
				canCreateInbound: true,
				inboundRowCount: 2,
				pendingQty: 2,
			}),
		).toBe(false);
	});

	it("distinguishes fulfilled needs from tracked needs that are merely covered", () => {
		expect(
			areAllInventoryNeedsFulfilled([
				{ status: "fulfilled" },
				{ status: "fulfilled" },
			]),
		).toBe(true);
		expect(
			areAllInventoryNeedsFulfilled([
				{ status: "fulfilled" },
				{ status: "allocated" },
			]),
		).toBe(false);
		expect(areAllInventoryNeedsFulfilled([])).toBe(false);
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
