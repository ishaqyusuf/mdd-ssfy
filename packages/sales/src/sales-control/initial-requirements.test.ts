import { expect, test } from "bun:test";
import { composeControls } from "../utils/sales-control";
import { getSalesItemControllablesInfoAction } from "./index";

function database(config: unknown, housePackageTool: unknown = null) {
	return {
		salesOrders: {
			findFirstOrThrow: async () => ({
				id: 1,
				isDyke: true,
				deliveries: [],
				assignments: [],
				itemControls: [],
				stat: [],
				items: [
					{
						id: 10,
						qty: 1,
						dykeProduction: false,
						multiDykeUid: null,
						formSteps: [{ prodUid: "moulding", value: "Mouldings" }],
						housePackageTool,
					},
				],
			}),
		},
		settings: {
			findFirst: async () => ({
				meta: { route: config === undefined ? {} : { moulding: { config } } },
			}),
		},
	} as unknown as Parameters<typeof getSalesItemControllablesInfoAction>[0];
}

test("a configured route with production omitted is non-production", async () => {
	const result = await getSalesItemControllablesInfoAction(
		database({ shipping: true }),
		1,
	);
	expect(result.items[0]?.itemStatConfig).toEqual({
		production: false,
		shipping: true,
	});
});
test("a missing route fails calibration instead of claiming production is unnecessary", async () => {
	await expect(
		getSalesItemControllablesInfoAction(database(undefined), 1),
	).rejects.toThrow("no requirement configuration");
});

test("control reconstruction cannot import doors from another order sharing a house package", async () => {
	const db = database(
		{ production: true, shipping: true },
		{
			id: 77,
			doors: [
				{
					id: 101,
					salesOrderId: 1,
					dimension: "2-6 x 6-8",
					totalQty: 2,
					lhQty: 2,
					rhQty: 0,
				},
				{
					id: 102,
					salesOrderId: 2,
					dimension: "2-8 x 6-8",
					totalQty: 7,
					lhQty: 0,
					rhQty: 7,
				},
			],
		},
	);
	const order = await getSalesItemControllablesInfoAction(db, 1);
	const controls = composeControls(order);
	expect(controls.map((control) => control.uid)).toEqual([
		"door-101-2-6 x 6-8",
	]);
	expect(
		controls[0]?.qtyControlData.find((row) => row.type === "qty")?.total,
	).toBe(2);
});
