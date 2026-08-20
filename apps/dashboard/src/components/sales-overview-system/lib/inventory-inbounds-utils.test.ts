import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

import {
	areAllInventoryNeedsFulfilled,
	canMarkInventoryNeedsAvailable,
	getInboundOrderableQty,
	getInventoryInboundEmptyStateCopy,
	getPendingInventoryQty,
	isInventoryNeedRow,
	resolveInventoryAvailabilityState,
	resolveInventoryCoverageDisplay,
	resolveInventoryInboundCountState,
	shouldAutoSyncSalesInventory,
	shouldShowInventoryInboundForm,
	shouldShowInventoryNeedsActions,
} from "./inventory-inbounds-utils";

describe("sales overview inventory inbound helpers", () => {
	it("separates available stock from ordered inbound coverage", () => {
		expect(
			resolveInventoryCoverageDisplay({
				qtyRequired: 12,
				qtyAllocated: 1,
				qtyInboundLinkedOpen: 5,
			}),
		).toEqual({
			requiredQty: 12,
			availableQty: 1,
			orderedQty: 5,
			orderedOfQty: 11,
			showAvailable: true,
			showOrdered: true,
		});

		expect(
			resolveInventoryCoverageDisplay({
				qtyRequired: 12,
				qtyAllocated: 0,
				qtyInboundLinkedOpen: 5,
			}),
		).toEqual({
			requiredQty: 12,
			availableQty: 0,
			orderedQty: 5,
			orderedOfQty: 12,
			showAvailable: false,
			showOrdered: true,
		});
	});

	it("clamps coverage and keeps an empty availability signal without inbound", () => {
		expect(
			resolveInventoryCoverageDisplay({
				qtyRequired: 12,
				qtyAllocated: 20,
				qtyInboundLinkedOpen: 5,
			}),
		).toEqual({
			requiredQty: 12,
			availableQty: 12,
			orderedQty: 0,
			orderedOfQty: 0,
			showAvailable: true,
			showOrdered: false,
		});

		expect(
			resolveInventoryCoverageDisplay({
				qtyRequired: 12,
				qtyAllocated: 0,
				qtyInboundLinkedOpen: 0,
			}),
		).toMatchObject({
			availableQty: 0,
			orderedQty: 0,
			showAvailable: true,
			showOrdered: false,
		});
	});

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

	it("gates Mark as available on capability, lifecycle, and pending qty", () => {
		expect(
			canMarkInventoryNeedsAvailable({
				canMarkAvailable: true,
				pendingQty: 2,
			}),
		).toBe(true);
		expect(
			canMarkInventoryNeedsAvailable({
				canMarkAvailable: true,
				pendingQty: 0,
			}),
		).toBe(false);
		expect(
			canMarkInventoryNeedsAvailable({
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

	it("configures Mark as available inbound form mode with locked status and selected items", () => {
		const tabSource = readFileSync(
			resolve(
				dirname(fileURLToPath(import.meta.url)),
				"../tabs/inventory-tab.tsx",
			),
			"utf8",
		);

		expect(tabSource.includes("Mark as available")).toBe(true);
		expect(tabSource.includes('inboundFormMode === "mark_available"')).toBe(
			true,
		);
		expect(tabSource.includes("setSelectedInboundRowIds(inboundRowIds)")).toBe(
			true,
		);
		expect(tabSource.includes("<span>Available</span>")).toBe(true);
	});

	it("opens secondary sheet in mark_available mode with reusable InboundCreatePane", () => {
		const sheetSource = readFileSync(
			resolve(
				dirname(fileURLToPath(import.meta.url)),
				"../../sheets/sales-overview-sheet/index.tsx",
			),
			"utf8",
		);
		const paneSource = readFileSync(
			resolve(
				dirname(fileURLToPath(import.meta.url)),
				"../../sheets/sales-overview-sheet/inbound-create-pane.tsx",
			),
			"utf8",
		);

		expect(sheetSource.includes("openInboundCreatePane = (")).toBe(true);
		expect(
			sheetSource.includes('mode: "create_inbound" | "mark_available"'),
		).toBe(true);
		expect(paneSource.includes('mode = "create_inbound"')).toBe(true);
		expect(paneSource.includes("operation: mode")).toBe(true);
		expect(
			paneSource.includes('useState<NewInboundShipmentStatus>("pending")'),
		).toBe(true);
	});
});
