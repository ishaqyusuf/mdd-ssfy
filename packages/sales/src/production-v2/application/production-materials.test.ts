import { describe, expect, it } from "bun:test";
import type { Db } from "@gnd/db";

import { getSalesProductionPlan } from "../../sales-fulfillment-plan";
import {
	buildProductionMaterialStatuses,
	loadProductionMaterialStatuses,
	summarizeProductionMaterials,
	unavailableProductionMaterialSummary,
} from "./production-materials";

describe("buildProductionMaterialStatuses", () => {
	it("exposes expected inbound availability without blocking assignment", () => {
		const expectedAt = new Date("2026-07-29T08:00:00.000Z");

		const result = buildProductionMaterialStatuses([
			{
				salesOrderId: 42,
				salesItemId: 101,
				componentId: 501,
				componentName: "Oak panels",
				supplierName: "Dyke Industries",
				readiness: "awaiting_inbound",
				stockStatus: "awaiting_inbound",
				orderedQty: 2,
				allocatedQty: 0,
				inboundQty: 2,
				receivedQty: 0,
				inventoryVariantSku: null,
				inboundEvidence: [
					{
						id: 701,
						qty: 1,
						qtyReceived: 0,
						status: "ordered",
						inboundShipmentItemId: 801,
						expectedAt,
					},
					{
						id: 702,
						qty: 1,
						qtyReceived: 0,
						status: "pending",
						inboundShipmentItemId: null,
						expectedAt: null,
					},
				],
			},
		]);

		expect(result).toEqual([
			{
				salesOrderId: 42,
				salesItemId: 101,
				componentId: 501,
				name: "Oak panels",
				supplierName: "Dyke Industries",
				readiness: "awaiting_inbound",
				stockStatus: "awaiting_inbound",
				requiredQty: 2,
				availableQty: 0,
				openInboundQty: 2,
				expectedAt,
				undatedOpenInboundQty: 1,
			},
		]);
		expect(summarizeProductionMaterials(result).undatedPendingCount).toBe(1);
	});
});

describe("summarizeProductionMaterials", () => {
	it("uses the latest open inbound date as the production start estimate", () => {
		const summary = summarizeProductionMaterials([
			{
				salesOrderId: 42,
				salesItemId: 101,
				componentId: 501,
				name: "Oak panels",
				supplierName: null,
				readiness: "awaiting_inbound",
				stockStatus: "awaiting_inbound",
				requiredQty: 2,
				availableQty: 0,
				openInboundQty: 2,
				expectedAt: "2026-07-29T08:00:00.000Z",
				undatedOpenInboundQty: 0,
			},
			{
				salesOrderId: 42,
				salesItemId: 102,
				componentId: 502,
				name: "Fasteners",
				supplierName: null,
				readiness: "awaiting_inbound",
				stockStatus: "awaiting_inbound",
				requiredQty: 4,
				availableQty: 0,
				openInboundQty: 4,
				expectedAt: "2026-07-30T08:00:00.000Z",
				undatedOpenInboundQty: 0,
			},
		]);

		expect(summary).toEqual({
			state: "pending",
			totalCount: 2,
			pendingCount: 2,
			openInboundQty: 6,
			expectedAt: "2026-07-30T08:00:00.000Z",
			undatedPendingCount: 0,
		});
	});

	it("tracks pending materials whose availability date is unknown", () => {
		const summary = summarizeProductionMaterials([
			{
				salesOrderId: 42,
				salesItemId: 101,
				componentId: 501,
				name: "Oak panels",
				supplierName: null,
				readiness: "awaiting_inbound",
				stockStatus: "awaiting_inbound",
				requiredQty: 2,
				availableQty: 0,
				openInboundQty: 2,
				expectedAt: "2026-07-29T08:00:00.000Z",
				undatedOpenInboundQty: 0,
			},
			{
				salesOrderId: 42,
				salesItemId: 102,
				componentId: 502,
				name: "Fasteners",
				supplierName: null,
				readiness: "blocked",
				stockStatus: "shortage",
				requiredQty: 4,
				availableQty: 0,
				openInboundQty: 0,
				expectedAt: null,
				undatedOpenInboundQty: 0,
			},
		]);

		expect(summary.expectedAt).toBe("2026-07-29T08:00:00.000Z");
		expect(summary.undatedPendingCount).toBe(1);
	});

	it("reports missing material setup without blocking the assignment", () => {
		expect(summarizeProductionMaterials([])).toEqual({
			state: "not_configured",
			totalCount: 0,
			pendingCount: 0,
			openInboundQty: 0,
			expectedAt: null,
			undatedPendingCount: 0,
		});
	});

	it("uses an explicit unavailable state when inventory lookup fails", () => {
		expect(unavailableProductionMaterialSummary()).toEqual({
			state: "unavailable",
			totalCount: 0,
			pendingCount: 0,
			openInboundQty: 0,
			expectedAt: null,
			undatedPendingCount: 0,
		});
	});
});

describe("getSalesProductionPlan", () => {
	it("loads material readiness for a page of production orders in one query", async () => {
		type FindManyArgs = {
			where: {
				saleId?: unknown;
			};
			take?: number;
		};
		let query: FindManyArgs | undefined;
		const db = {
			lineItem: {
				findMany: async (args: FindManyArgs) => {
					query = args;
					return [];
				},
			},
		};

		await getSalesProductionPlan(db as unknown as Db, {
			salesOrderIds: [42, 43, 42],
			completeOrder: true,
		});

		expect(query?.where.saleId).toEqual({ in: [42, 43] });
		expect(query?.take).toBeUndefined();
	});

	it("keeps production detail available when material lookup fails", async () => {
		const db = {
			lineItem: {
				findMany: async () => {
					throw new Error("inventory unavailable");
				},
			},
		};

		expect(
			await loadProductionMaterialStatuses(db as unknown as Db, {
				salesOrderId: 42,
				completeOrder: true,
			}),
		).toEqual({
			state: "unavailable",
			materials: [],
		});
	});
});
