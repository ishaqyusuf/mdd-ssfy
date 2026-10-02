import { describe, expect, test } from "bun:test";
import type { Db } from "@gnd/db";
import {
	getWorkflowStock,
	stockAvailability,
	stockLevel,
	workflowStockSchema,
} from "./workflow-stock";
describe("workflow stock availability", () => {
	test("reports zero, threshold and healthy levels with shared stock budgets", () => {
		expect(stockLevel(stockAvailability(10, 10), 5)).toBe("out_of_stock");
		expect(stockLevel(stockAvailability(10, 5), 5)).toBe("low_stock");
		expect(stockLevel(stockAvailability(10, 4), 5)).toBe("available");
		expect(stockLevel(1, 0)).toBe("available");
		expect(stockAvailability(2, 3)).toBe(0);
	});
	test("does not aggregate distinct variants or subtract archived stock allocations", async () => {
		let allocationFilter: unknown;
		const db = {
			dykeSteps: { findFirst: async () => ({ uid: "jamb" }) },
			inventoryCategory: {
				findMany: async () => [
					{
						id: 1,
						stockMode: "monitored",
						productKind: "inventory",
						meta: { stockSettings: { lowStockAlert: 5 } },
					},
				],
			},
			inventory: {
				findMany: async () => [
					{
						id: 2,
						uid: "component",
						sourceComponentUid: "component",
						productKind: "inventory",
						variants: [
							{
								id: 3,
								sku: "A",
								stockAlertsEnabled: false,
								lowStockAlert: null,
								stocks: [{ id: 10, qty: 10 }],
							},
							{
								id: 4,
								sku: "B",
								lowStockAlert: 0,
								stocks: [{ id: 11, qty: 2 }],
							},
						],
					},
				],
			},
			stockAllocation: {
				groupBy: async (args: unknown) => {
					allocationFilter = args;
					return [
						{
							inventoryVariantId: 3,
							inventoryStockId: 10,
							status: "consumed",
							_sum: { qty: 6 },
						},
						{
							inventoryVariantId: 3,
							inventoryStockId: 10,
							status: "pending_review",
							_sum: { qty: 1 },
						},
					];
				},
			},
		} as unknown as Db;
		const result = await getWorkflowStock(db, {
			stepId: 1,
			componentUids: ["component", "missing"],
		});
		expect(result.components[0]?.variants).toMatchObject([
			{ id: 3, available: 4, threshold: 5, level: "low_stock" },
			{ id: 4, available: 2, threshold: 0, level: "available" },
		]);
		expect(result.components[1]?.mapped).toBe(false);
		expect(result.components[0]?.status).toBe("available");
		expect(result.components[0]?.variants[0]?.alertsEnabled).toBe(false);
		const summary = await getWorkflowStock(db, {
			stepId: 1,
			componentUids: ["component"],
			includeVariants: false,
		});
		expect(summary.components[0]).toMatchObject({
			mapped: true,
			variantCount: 2,
			status: "available",
			variants: [],
		});
		expect(allocationFilter).toMatchObject({ where: { deletedAt: null } });
	});
	test("bounds active component reads", () => {
		expect(
			workflowStockSchema.safeParse({
				stepId: 1,
				componentUids: Array(301).fill("x"),
			}).success,
		).toBe(false);
	});
});
