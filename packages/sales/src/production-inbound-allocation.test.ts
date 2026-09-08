import { expect, test } from "bun:test";
import { validateProductionAllocationCoverage } from "./production-inbound-allocation";

const pending = {
	id: 1,
	qty: 2,
	status: "pending_review",
	inventoryStockId: 10,
	inventoryVariantId: 20,
};
const component = {
	id: 100,
	qty: 2,
	inventoryVariantId: 20,
	stockAllocations: [pending],
};
const stock = { id: 10, qty: 2, inventoryVariantId: 20 };

test("confirms only pending allocations covered by matching physical stock", () => {
	expect(
		validateProductionAllocationCoverage([component], [stock], []),
	).toEqual([1]);
	expect(
		validateProductionAllocationCoverage(
			[
				{
					...component,
					stockAllocations: [{ ...pending, status: "approved" }],
				},
			],
			[stock],
			[],
		),
	).toEqual([]);
});
test("rejects pending quantities exceeding the material need", () => {
	expect(() =>
		validateProductionAllocationCoverage(
			[{ ...component, stockAllocations: [{ ...pending, qty: 10 }] }],
			[{ ...stock, qty: 10 }],
			[],
		),
	).toThrow("exceed material needs");
});
test("rejects unavailable, mismatched and already committed physical capacity", () => {
	expect(() =>
		validateProductionAllocationCoverage([component], [], []),
	).toThrow("matching physical stock");
	expect(() =>
		validateProductionAllocationCoverage(
			[component],
			[{ ...stock, inventoryVariantId: 21 }],
			[],
		),
	).toThrow("matching physical stock");
	expect(() =>
		validateProductionAllocationCoverage(
			[component],
			[stock],
			[{ inventoryStockId: 10, qty: 1 }],
		),
	).toThrow("exceed available physical stock");
});
test("does not count the same stock twice across current-order components", () => {
	expect(() =>
		validateProductionAllocationCoverage(
			[
				component,
				{ ...component, id: 101, stockAllocations: [{ ...pending, id: 2 }] },
			],
			[stock],
			[],
		),
	).toThrow("exceed available physical stock");
});
