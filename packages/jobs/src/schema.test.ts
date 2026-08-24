import { describe, expect, it } from "bun:test";
import {
	allocateReceivedInboundToBackordersSchemaTask,
	backfillSalesInventoryLineItemsSchemaTask,
	inventoryReconciliationReportSchemaTask,
	migrateSalesInventoryLegacyStatusSchemaTask,
	syncSalesInventoryLineItemsSchemaTask,
} from "./schema";

describe("sales inventory sync task schemas", () => {
	it("requires a positive integer sales order id for single-sale sync", () => {
		expect(
			syncSalesInventoryLineItemsSchemaTask.safeParse({
				salesOrderId: 12,
				source: "repair",
			}).success,
		).toBe(true);

		for (const salesOrderId of [0, -1, 10.5]) {
			expect(
				syncSalesInventoryLineItemsSchemaTask.safeParse({
					salesOrderId,
					source: "repair",
				}).success,
			).toBe(false);
		}
	});

	it("requires explicit backfill ids and cursors to be integer-safe", () => {
		expect(
			backfillSalesInventoryLineItemsSchemaTask.safeParse({
				salesOrderIds: [1, 2],
				cursorId: 0,
				batchSize: 25,
			}).success,
		).toBe(true);

		for (const input of [
			{ salesOrderIds: [] },
			{ salesOrderIds: [1.25] },
			{ salesOrderIds: [-4] },
			{ salesOrderIds: Array.from({ length: 201 }, (_, index) => index + 1) },
			{ cursorId: -1 },
			{ cursorId: 3.5 },
			{ batchSize: 1.5 },
		]) {
			expect(
				backfillSalesInventoryLineItemsSchemaTask.safeParse(input).success,
			).toBe(false);
		}
	});
});

describe("legacy sales inventory migration task schema", () => {
	it("requires the exact status, save revision, and server actor", () => {
		expect(
			migrateSalesInventoryLegacyStatusSchemaTask.safeParse({
				salesOrderId: 12,
				legacyStatus: "AVAILABLE",
				savedOrderUpdatedAt: "2026-08-24T19:57:53.000Z",
				actor: { id: 7, name: "Pablo" },
			}).success,
		).toBe(true);

		for (const input of [
			{
				salesOrderId: 0,
				legacyStatus: "AVAILABLE",
				savedOrderUpdatedAt: "2026-08-24T19:57:53.000Z",
				actor: { id: 7, name: "Pablo" },
			},
			{
				salesOrderId: 12,
				legacyStatus: "UNKNOWN",
				savedOrderUpdatedAt: "2026-08-24T19:57:53.000Z",
				actor: { id: 7, name: "Pablo" },
			},
			{
				salesOrderId: 12,
				legacyStatus: "ORDERED",
				savedOrderUpdatedAt: "not-a-date",
				actor: { id: 7, name: "Pablo" },
			},
			{
				salesOrderId: 12,
				legacyStatus: "ORDERED",
				savedOrderUpdatedAt: "2026-08-24T19:57:53.000Z",
			},
		]) {
			expect(
				migrateSalesInventoryLegacyStatusSchemaTask.safeParse(input).success,
			).toBe(false);
		}
	});

	it("avoids bundler-sensitive schema derivation at module initialization", async () => {
		const source = await Bun.file(new URL("./schema.ts", import.meta.url)).text();
		expect(source).not.toContain(
			"migrateSalesInventoryLegacyStatusSchemaTask.omit",
		);
		expect(source).toContain("migrateSalesInventoryLegacyStatusFields");
	});
});

describe("inventory reconciliation report schema", () => {
	it("keeps dry-run report cursors and ids integer-safe", () => {
		expect(
			inventoryReconciliationReportSchemaTask.safeParse({
				salesOrderId: 8,
				cursorId: 0,
				limit: 50,
				sampleLimit: 10,
			}).success,
		).toBe(true);

		for (const input of [
			{ salesOrderId: 0 },
			{ salesOrderId: -2 },
			{ salesOrderId: 4.5 },
			{ cursorId: -1 },
			{ cursorId: 2.25 },
			{ limit: 25.5 },
			{ sampleLimit: 3.5 },
		]) {
			expect(
				inventoryReconciliationReportSchemaTask.safeParse(input).success,
			).toBe(false);
		}
	});
});

describe("received inbound backorder allocation schema", () => {
	it("keeps retry allocation filters integer-safe", () => {
		expect(
			allocateReceivedInboundToBackordersSchemaTask.safeParse({
				salesOrderId: 20,
				lineItemComponentIds: [30, 31],
				inventoryVariantId: 40,
				limit: 50,
			}).success,
		).toBe(true);

		expect(
			allocateReceivedInboundToBackordersSchemaTask.safeParse({
				lineItemComponentIds: [],
			}).success,
		).toBe(true);

		for (const input of [
			{ salesOrderId: 0 },
			{ salesOrderId: -1 },
			{ salesOrderId: 1.2 },
			{ lineItemComponentIds: [1, 2.5] },
			{ lineItemComponentIds: [-3] },
			{ inventoryVariantId: 0 },
			{ inventoryVariantId: 4.5 },
			{ limit: 20.5 },
		]) {
			expect(
				allocateReceivedInboundToBackordersSchemaTask.safeParse(input).success,
			).toBe(false);
		}
	});
});
