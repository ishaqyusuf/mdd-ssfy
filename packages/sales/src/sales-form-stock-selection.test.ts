import { expect, test } from "bun:test";
import {
	applySalesFormStockSchema,
	salesFormStockPlanSchema,
} from "./sales-form-stock-application";

test("selected needs are bounded, positive and canonical for confirmation and replay", () => {
	const selected = salesFormStockPlanSchema.parse({
		salesOrderId: 12,
		componentIds: [3, 1, 3],
	});
	expect(selected.componentIds).toEqual([1, 3]);
	expect(
		applySalesFormStockSchema.parse({
			...selected,
			expectedRevision: "a".repeat(64),
		}).componentIds,
	).toEqual([1, 3]);
	for (const componentIds of [
		[],
		[0],
		[-1],
		Array.from({ length: 2001 }, (_, i) => i + 1),
	])
		expect(
			salesFormStockPlanSchema.safeParse({ salesOrderId: 12, componentIds })
				.success,
		).toBe(false);
	expect(
		salesFormStockPlanSchema.parse({ salesOrderId: 12 }).componentIds,
	).toBeUndefined();
});
