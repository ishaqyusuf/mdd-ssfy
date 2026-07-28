import { describe, expect, test } from "bun:test";

import { resolveSalesInventoryApplicability } from "./sales-inventory-applicability";

describe("resolveSalesInventoryApplicability", () => {
	test("marks a completed zero-need projection as not applicable", () => {
		expect(
			resolveSalesInventoryApplicability({
				lifecycleStatus: "awaiting_production",
				projection: {
					status: "ready",
					needCount: 0,
					completedAt: new Date("2026-07-28T10:00:00.000Z"),
				},
			}),
		).toEqual({
			state: "not_applicable",
			needCount: 0,
			isInboundApplicable: false,
			canManualSync: false,
			label: "N/A",
			description: "No inventory requirements were found for this sale.",
			lastSyncedAt: new Date("2026-07-28T10:00:00.000Z"),
		});
	});

	test("keeps needs applicable after stock or inbound fulfillment", () => {
		expect(
			resolveSalesInventoryApplicability({
				lifecycleStatus: "fulfilled",
				projection: {
					status: "ready",
					needCount: 3,
					completedAt: new Date("2026-07-28T10:00:00.000Z"),
				},
			}),
		).toMatchObject({
			state: "applicable",
			needCount: 3,
			isInboundApplicable: true,
			canManualSync: false,
		});
	});

	test("leaves active legacy sales available for explicit manual sync", () => {
		expect(
			resolveSalesInventoryApplicability({
				lifecycleStatus: "in_production",
				projection: null,
			}),
		).toMatchObject({
			state: "not_synced",
			needCount: null,
			isInboundApplicable: null,
			canManualSync: true,
			label: "Not synced",
		});
	});

	test("recognizes existing required inventory rows when the projection marker is missing", () => {
		expect(
			resolveSalesInventoryApplicability({
				lifecycleStatus: "awaiting_production",
				projection: null,
				existingInventoryNeedCount: 1,
			}),
		).toMatchObject({
			state: "applicable",
			needCount: 1,
			isInboundApplicable: true,
			canManualSync: false,
			label: "Inventory required",
		});
	});

	test("does not repair legacy sales after production completion", () => {
		expect(
			resolveSalesInventoryApplicability({
				lifecycleStatus: "ready_to_fulfill",
				projection: null,
			}),
		).toMatchObject({
			state: "legacy_not_applicable",
			needCount: null,
			isInboundApplicable: false,
			canManualSync: false,
			label: "N/A",
		});
	});

	test("surfaces syncing and failed projections without claiming N/A", () => {
		expect(
			resolveSalesInventoryApplicability({
				lifecycleStatus: "awaiting_production",
				projection: {
					status: "syncing",
					needCount: 0,
					completedAt: null,
				},
			}),
		).toMatchObject({
			state: "syncing",
			isInboundApplicable: null,
			label: "Syncing…",
		});
		expect(
			resolveSalesInventoryApplicability({
				lifecycleStatus: "awaiting_production",
				projection: {
					status: "failed",
					needCount: 0,
					completedAt: null,
				},
			}),
		).toMatchObject({
			state: "failed",
			isInboundApplicable: null,
			canManualSync: true,
			label: "Review",
		});
	});
});
