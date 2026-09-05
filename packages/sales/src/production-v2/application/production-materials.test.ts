import { describe, expect, it } from "bun:test";
import type { Db } from "@gnd/db";

import { buildSalesProductionPlan, getSalesProductionPlan } from "../../sales-fulfillment-plan";
import {
	buildProductionItemMaterialStatus,
	buildProductionMaterialStatuses,
	loadProductionMaterialStatuses,
	summarizeProductionMaterials,
	unavailableProductionMaterialSummary,
} from "./production-materials";

describe("buildProductionMaterialStatuses", () => {
	it("keeps unavailable material applicability unknown instead of asserting no material is needed", () => {
		const result = buildProductionItemMaterialStatus({
			salesOrderId: 42,
			salesItemId: 101,
			reviewPending: false,
			projectionState: "unavailable",
			materials: [],
		});
		expect(result.code).toBe("status_unknown");
		expect(result.applicability).toBe("unknown");
	});

	it("treats a production service without tracked material as not required", () => {
		const result = buildProductionItemMaterialStatus({
			salesOrderId: 42,
			salesItemId: 101,
			reviewPending: false,
			projectionState: "available",
			materials: [],
		});

		expect(result.code).toBe("not_required");
		expect(result.label).toBe("NO MATERIAL NEEDED");
	});

	it("lets an explicit tracked need override the service fallback", () => {
		const result = buildProductionItemMaterialStatus({
			salesOrderId: 42,
			salesItemId: 101,
			reviewPending: false,
			projectionState: "available",
			materials: [
				{
					salesOrderId: 42,
					salesItemId: 101,
					componentId: 501,
					name: "Installation adhesive",
					inventoryVariantUid: null,
					supplierName: null,
					readiness: "blocked",
					stockStatus: "shortage",
					requiredQty: 1,
					availableQty: 0,
					allocatedQty: 0,
					pendingReviewQty: 0,
					receivedQty: 0,
					openInboundQty: 0,
					expectedAt: null,
					undatedOpenInboundQty: 0,
					productionEligibilityConflict: false,
					inbounds: [],
				},
			],
		});

		expect(result.code).toBe("material_shortage");
	});

	it("does not infer a material requirement from production capability", () => {
		const result = buildProductionItemMaterialStatus({
			salesOrderId: 42,
			salesItemId: 102,
			reviewPending: false,
			projectionState: "available",
			materials: [],
		});

		expect(result.code).toBe("not_required");
		expect(result.label).toBe("NO MATERIAL NEEDED");
	});

	it("exposes expected inbound availability without blocking assignment", () => {
		const expectedAt = new Date("2026-07-29T08:00:00.000Z");

		const result = buildProductionMaterialStatuses([
			{
				salesOrderId: 42,
				salesItemId: 101,
				componentId: 501,
				componentName: "Oak panels",
				inventoryVariantUid: "w2_0-h6_8",
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
						shipmentStatus: "in_progress",
						supplierName: "Inbound Supplier",
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
				inventoryVariantUid: "w2_0-h6_8",
				supplierName: "Dyke Industries",
				readiness: "awaiting_inbound",
				stockStatus: "awaiting_inbound",
				requiredQty: 2,
				availableQty: 0,
				allocatedQty: 0,
				pendingReviewQty: 0,
				receivedQty: 0,
				openInboundQty: 2,
				expectedAt,
				undatedOpenInboundQty: 1,
				productionEligibilityConflict: false,
				inbounds: [
					{
						id: 801,
						status: "in_progress",
						expectedAt,
						supplierName: "Inbound Supplier",
						quantity: 1,
					},
					{
						id: 702,
						status: "pending",
						expectedAt: null,
						supplierName: "Dyke Industries",
						quantity: 1,
					},
				],
			},
		]);
		expect(summarizeProductionMaterials(result).undatedPendingCount).toBe(1);
	});

	it("scopes repeated door designs to the exact production-item dimension", () => {
		const material = {
			salesOrderId: 42,
			salesItemId: 101,
			componentId: 501,
			name: "Carrara door",
			supplierName: "Dyke",
			readiness: "awaiting_inbound" as const,
			stockStatus: "awaiting_inbound" as const,
			requiredQty: 1,
			availableQty: 0,
			allocatedQty: 0,
			pendingReviewQty: 0,
			receivedQty: 0,
			openInboundQty: 1,
			expectedAt: "2026-09-05T00:00:00.000Z",
			undatedOpenInboundQty: 0,
			productionEligibilityConflict: false,
			inbounds: [
				{
					id: 1,
					status: "in_progress",
					expectedAt: "2026-09-05T00:00:00.000Z",
					supplierName: "Dyke",
					quantity: 1,
				},
			],
		};
		const result = buildProductionItemMaterialStatus({
			salesOrderId: 42,
			salesItemId: 101,
			productionItemDimension: "2-0 x 6-8",
			reviewPending: false,
			projectionState: "available",
			materials: [
				{ ...material, inventoryVariantUid: "w2_0-h6_8" },
				{
					...material,
					componentId: 502,
					inventoryVariantUid: "w2_4-h6_8",
					inbounds: [{ ...material.inbounds[0], id: 2 }],
				},
			],
		});

		expect(result.inbounds).toHaveLength(1);
		expect(result.inbounds[0]?.id).toBe(1);
		expect(result.quantityGroups[0]?.openInbound).toBe(1);
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
	it("starts independent material evidence reads together without dropping order scope", async () => {
		const gate = Promise.withResolvers<void>();
		const calls: Array<{ where: { saleId?: unknown }; take?: number }> = [];
		const db = { lineItem: { findMany: async (args: typeof calls[number]) => {
			calls.push(args);
			await gate.promise;
			return [];
		} } };
		const pending = getSalesProductionPlan(db as unknown as Db, { salesOrderIds: [42, 43, 42], completeOrder: true });
		try {
			expect(calls).toHaveLength(4);
			for (const call of calls) {
				expect(call.where.saleId).toEqual({ in: [42, 43] });
				expect(call.take).toBeUndefined();
			}
		} finally {
			gate.resolve();
			await pending;
		}
	});

	it.each(["fresh", "missing-header", "missing-line", "missing-component", "wrong-component", "retargeted-component"])(
		"joins material evidence by line/component ID and rejects gaps: %s", async (scenario) => {
			const lines = [1, 2].map(id => ({
				id, uid: `line-${id}`, title: `Door ${id}`, qty: id,
				saleId: id + 40, sale: { id: id + 40, orderId: `ORDER-${id}` },
				salesItem: { id: id + 100, itemDeliveries: [] },
				components: [1, 2].map(part => ({
					id: id * 10 + part, required: true, qty: id,
					inventoryId: 500, inventoryVariantId: id * 10 + part,
					inventory: { id: 500, name: "Door", stockMode: "monitored" },
					inventoryVariant: { id: id * 10 + part, sku: `SIZE-${id}-${part}` },
					stockAllocations: [{ id: id * 100 + part, qty: id, status: "reserved" }],
					inboundDemands: [{ id: id * 1000 + part, qty: 1, qtyReceived: 0, status: "ordered",
						inboundShipmentItemId: id * 10000 + part,
						inboundShipmentItem: { inbound: { expectedAt: new Date("2026-09-10"), status: "ordered", supplier: { name: `Supplier ${id}` } } },
					}],
				})),
			}));
			let call = 0;
			const project = (value: unknown, select: Record<string, unknown>): unknown => {
				if (value == null) return value;
				if (Array.isArray(value)) return value.map(item => project(item, select));
				const row = value as Record<string, unknown>;
				return Object.fromEntries(Object.entries(select).map(([key, option]) => [key,
					option === true ? row[key] : project(row[key], (option as { select: Record<string, unknown> }).select),
				]));
			};
			const db = { lineItem: { findMany: async (args: { select: Record<string, unknown> }) => {
				call += 1;
				const result = structuredClone(lines);
				if (call === 1 && scenario === "missing-header") return project(result.slice(1), args.select);
				if (call === 3 && scenario === "retargeted-component") result[0].components[0].inventoryVariantId = 999;
				if (call === 4) {
					if (scenario === "missing-line") return project(result.slice(1), args.select);
					if (scenario === "missing-component") result[0].components.pop();
					if (scenario === "wrong-component") result[0].components[0].id = 999;
				}
				if (call > 1) {
					result.reverse();
					if (call > 2) for (const line of result) line.components.reverse();
				}
				return project(result, args.select);
			} } };
			const result = getSalesProductionPlan(db as unknown as Db, { salesOrderIds: [41, 42], completeOrder: true });
			if (scenario === "fresh") {
				const actual = await result;
				const expected = buildSalesProductionPlan(lines, { completeOrder: true, limit: 100 });
				expect(actual).toEqual(expected);
				expect(actual.summary.componentCount).toBe(4);
			} else {
				await expect(result).rejects.toThrow("Production material evidence changed");
			}
		},
	);

	it("loads material readiness for a page of production orders with one shared scope", async () => {
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
