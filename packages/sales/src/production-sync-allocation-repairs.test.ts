import { expect, test } from "bun:test";
import { planProductionAllocationRepairs } from "./production-sync-allocation-repairs";

const component = { id: 1, qty: 20, inventoryVariantId: 7, stockAllocations: [
	{ id: 10, qty: 17, status: "reserved", inventoryStockId: 4, inventoryVariantId: 7 },
	{ id: 11, qty: 3, status: "pending_review", inventoryStockId: 5, inventoryVariantId: 7 },
] };
test("replaces only blocked pending suggestions with fully received remaining coverage", () => {
	expect(planProductionAllocationRepairs([component], [1], [{ componentId: 1, inventoryVariantId: 7, qty: 3 }])).toEqual([{ componentId: 1, inventoryVariantId: 7, qty: 3, allocationIds: [11] }]);
	expect(planProductionAllocationRepairs([component], [], [{ componentId: 1, inventoryVariantId: 7, qty: 3 }])).toEqual([]);
	expect(planProductionAllocationRepairs([component], [1], [{ componentId: 1, inventoryVariantId: 7, qty: 2 }])).toEqual([]);
});
test("never repairs invalid committed quantities or variant conflicts", () => {
	for (const changes of [{ qty: -1 }, { qty: 21 }, { inventoryVariantId: 8 }]) {
		const bad = { ...component, stockAllocations: [{ ...component.stockAllocations[0]!, ...changes }, component.stockAllocations[1]!] };
		expect(planProductionAllocationRepairs([bad], [1], [{ componentId: 1, inventoryVariantId: 7, qty: 20 }])).toEqual([]);
	}
});
test("obsolete suggestions can be retired without reserving again when already fully committed", () => {
	expect(planProductionAllocationRepairs([{ ...component, qty: 17 }], [1], [])).toEqual([{ componentId: 1, inventoryVariantId: 7, qty: 0, allocationIds: [11] }]);
});
