import { expect, test } from "bun:test";
import { getSalesItemControllablesInfoAction } from "./index";

function database(config: unknown) {
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
						housePackageTool: null,
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
