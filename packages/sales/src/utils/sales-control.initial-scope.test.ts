import { describe, expect, test } from "bun:test";
import { composeControls } from "./sales-control";

function order(production: boolean, assigned = 0) {
	return {
		id: 1,
		isDyke: true,
		itemControls: [],
		stat: [],
		deliveries: [],
		items: [
			{
				id: 10,
				qty: 3,
				description: "Simple item",
				housePackageTool: null,
				itemStatConfig: { production, shipping: true },
			},
		],
		assignments: assigned
			? [
					{
						itemId: 10,
						qtyAssigned: assigned,
						lhQty: 0,
						rhQty: 0,
						submissions: [],
					},
				]
			: [],
	} as unknown as Parameters<typeof composeControls>[0];
}

describe("saved sale control scope", () => {
	test("a simple non-production line has fulfillment scope but no production scope", () => {
		const [control] = composeControls(order(false));
		expect(control?.controlData.produceable).toBe(false);
		expect(control?.controlData.shippable).toBe(true);
		expect(
			control?.qtyControlData.find((q) => q.type === "prodAssigned")?.itemTotal,
		).toBe(0);
	});
	test.each([false, true])(
		"door production override %s overrides its route",
		(production) => {
			const fixture = order(!production);
			fixture.items[0]!.housePackageTool = {
				doors: [
					{
						id: 33,
						dimension: "30",
						totalQty: 3,
						lhQty: 0,
						rhQty: 0,
						meta: { prodOverride: { production } },
					},
				],
			} as never;
			const [control] = composeControls(fixture);
			expect(control?.controlData.produceable).toBe(production);
			expect(
				control?.qtyControlData.find((q) => q.type === "prodAssigned")
					?.itemTotal,
			).toBe(production ? 3 : 0);
		},
	);
	test("a production line has scope before assignment and keeps actual progress on regeneration", () => {
		const [initial] = composeControls(order(true));
		expect(initial?.controlData.produceable).toBe(true);
		expect(
			initial?.qtyControlData.find((q) => q.type === "prodAssigned")?.qty,
		).toBe(0);
		const [updated] = composeControls(order(true, 2));
		expect(
			updated?.qtyControlData.find((q) => q.type === "prodAssigned")?.qty,
		).toBe(2);
	});
});
