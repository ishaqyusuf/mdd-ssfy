import { describe, expect, it } from "bun:test";

import { resolveLegacyInventoryPostSaveAction } from "./legacy-inventory-post-save";

describe("legacy inventory post-save routing", () => {
	it("queues recognized legacy orders and skips the blocking configurator", () => {
		expect(
			resolveLegacyInventoryPostSaveAction({
				salesId: 24057,
				orderNo: "09405PC",
				salesType: "order",
				inventoryStatus: "available",
				savedOrderUpdatedAt: "2026-08-24T19:57:53.000Z",
				afterSuccessfulSave: true,
			}),
		).toEqual({
			action: "queue_legacy_adaptation",
			salesOrderId: 24057,
			orderNo: "09405PC",
			legacyStatus: "AVAILABLE",
			savedOrderUpdatedAt: "2026-08-24T19:57:53.000Z",
		});
	});

	it("opens the canonical inventory overview for ordinary saved orders", () => {
		expect(
			resolveLegacyInventoryPostSaveAction({
				salesId: 24058,
				orderNo: "09406PC",
				salesType: "order",
				inventoryStatus: null,
				savedOrderUpdatedAt: "2026-08-24T20:00:00.000Z",
				afterSuccessfulSave: true,
			}),
		).toEqual({
			action: "open_inventory_overview",
			orderNo: "09406PC",
		});
	});

	it("never queues adaptation from an open-only historical order", () => {
		expect(
			resolveLegacyInventoryPostSaveAction({
				salesId: 24057,
				orderNo: "09405PC",
				salesType: "order",
				inventoryStatus: "AVAILABLE",
				savedOrderUpdatedAt: "2026-08-24T19:57:53.000Z",
				afterSuccessfulSave: false,
			}),
		).toEqual({ action: "none" });
	});

	it("still queues a recognized legacy order after a PO-only save", () => {
		expect(
			resolveLegacyInventoryPostSaveAction({
				salesId: 24057,
				orderNo: "09405PC",
				salesType: "order",
				inventoryStatus: "AVAILABLE",
				savedOrderUpdatedAt: "2026-08-24T19:57:53.000Z",
				afterSuccessfulSave: true,
				skipOrdinaryInventoryContinuation: true,
			}),
		).toEqual({
			action: "queue_legacy_adaptation",
			salesOrderId: 24057,
			orderNo: "09405PC",
			legacyStatus: "AVAILABLE",
			savedOrderUpdatedAt: "2026-08-24T19:57:53.000Z",
		});
	});

	it("suppresses the ordinary inventory continuation for a PO-only save", () => {
		expect(
			resolveLegacyInventoryPostSaveAction({
				salesId: 24058,
				orderNo: "09406PC",
				salesType: "order",
				inventoryStatus: null,
				savedOrderUpdatedAt: "2026-08-24T20:00:00.000Z",
				afterSuccessfulSave: true,
				skipOrdinaryInventoryContinuation: true,
			}),
		).toEqual({ action: "none" });
	});
});
