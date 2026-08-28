import { describe, expect, test } from "bun:test";

import { resolveSalesInventoryLegacyCompatibility } from "./sales-inventory-legacy-compatibility";

describe("resolveSalesInventoryLegacyCompatibility", () => {
	test.each([
		["ORDERED", "in_progress", "create_inbound", "inbounds"],
		["PENDING ORDER", "pending", "create_inbound", "inbounds"],
		["AVAILABLE", null, "fulfill_manually", "stock"],
	] as const)(
		"maps recognized %s status to its automatic adaptation",
		(
			legacyStatus,
			targetShipmentStatus,
			targetNeedAction,
			destinationSegment,
		) => {
			expect(
				resolveSalesInventoryLegacyCompatibility({
					legacyStatus: ` ${legacyStatus.toLowerCase()} `,
					lifecycleStatus: "awaiting_production",
					inventoryRowCount: 0,
				}),
			).toMatchObject({
				state: "legacy_locked",
				normalizedLegacyStatus: legacyStatus,
				targetShipmentStatus,
				targetNeedAction,
				destinationSegment,
				canContinue: true,
			});
		},
	);

	test("routes unsupported historical values to review", () => {
		expect(
			resolveSalesInventoryLegacyCompatibility({
				legacyStatus: "ON THE WAY",
				lifecycleStatus: "awaiting_production",
				inventoryRowCount: 0,
			}),
		).toMatchObject({
			state: "unsupported",
			displayLabel: "Status needs review",
			canContinue: false,
			canClear: true,
		});
	});

	test("keeps linked inventory and terminal lifecycle ahead of adaptation", () => {
		expect(
			resolveSalesInventoryLegacyCompatibility({
				legacyStatus: "ORDERED",
				lifecycleStatus: "awaiting_production",
				inventoryRowCount: 0,
				activeLinkedInboundCount: 1,
			}).state,
		).toBe("legacy_reconciled");
		expect(
			resolveSalesInventoryLegacyCompatibility({
				legacyStatus: "ORDERED",
				lifecycleStatus: "fulfilled",
				inventoryRowCount: 0,
			}).state,
		).toBe("terminal");
	});

	test("keeps completed linked inbound evidence ahead of adaptation", () => {
		expect(
			resolveSalesInventoryLegacyCompatibility({
				legacyStatus: "ORDERED",
				lifecycleStatus: "awaiting_production",
				inventoryRowCount: 1,
				linkedInboundCount: 1,
				activeLinkedInboundCount: 0,
			}).state,
		).toBe("legacy_reconciled");
	});

	test("keeps ORDERED actionable when needs exist but no inbound represents it", () => {
		expect(
			resolveSalesInventoryLegacyCompatibility({
				legacyStatus: "ORDERED",
				lifecycleStatus: "awaiting_production",
				inventoryRowCount: 12,
				activeLinkedInboundCount: 0,
			}),
		).toMatchObject({
			state: "legacy_locked",
			targetShipmentStatus: "in_progress",
			canContinue: true,
		});
	});

	test("keeps a successfully projected ORDERED order reconciled after its inbound is received", () => {
		expect(
			resolveSalesInventoryLegacyCompatibility({
				legacyStatus: "ORDERED",
				lifecycleStatus: "awaiting_production",
				inventoryRowCount: 3,
				projectionStatus: "ready",
				projectionNeedCount: 3,
				projectionSource: "legacy-status",
				activeLinkedInboundCount: 0,
			}).state,
		).toBe("legacy_reconciled");
	});

	test("reconciles AVAILABLE from any durable ready projection", () => {
		expect(
			resolveSalesInventoryLegacyCompatibility({
				legacyStatus: "AVAILABLE",
				lifecycleStatus: "awaiting_production",
				inventoryRowCount: 0,
				projectionStatus: "ready",
				projectionNeedCount: 0,
			}).state,
		).toBe("legacy_reconciled");
		expect(
			resolveSalesInventoryLegacyCompatibility({
				legacyStatus: "AVAILABLE",
				lifecycleStatus: "awaiting_production",
				inventoryRowCount: 2,
				projectionStatus: "ready",
				projectionNeedCount: 2,
			}).state,
		).toBe("legacy_reconciled");
		expect(
			resolveSalesInventoryLegacyCompatibility({
				legacyStatus: "AVAILABLE",
				lifecycleStatus: "awaiting_production",
				inventoryRowCount: 2,
				projectionStatus: "ready",
				projectionNeedCount: 2,
				projectionSource: "legacy-status",
			}).state,
		).toBe("legacy_reconciled");
	});
});
