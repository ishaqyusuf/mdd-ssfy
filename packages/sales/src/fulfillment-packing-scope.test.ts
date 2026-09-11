import { expect, test } from "bun:test";
import { validateFulfillmentPackingScope } from "./fulfillment-packing-scope";

const meta = {
	fulfillmentAssignment: {
		version: 1,
		revision: 2,
		selectionMode: "selected",
		lines: [
			{ uid: "a", quantity: { qty: 5, lh: 0, rh: 0 } },
			{ uid: "b", quantity: { qty: 0, lh: 2, rh: 3 } },
		],
	},
};
test("short load preserves original assignment and exact handed remainder", () => {
	const result = validateFulfillmentPackingScope({
		meta,
		expectedScopeRevision: 2,
		lines: [
			{ uid: "a", quantity: { qty: 3, lh: 0, rh: 0 } },
			{ uid: "b", quantity: { qty: 0, lh: 1, rh: 3 } },
		],
	});
	expect(result[0]?.leftBehind).toEqual({ qty: 2, lh: 0, rh: 0 });
	expect(result[1]?.leftBehind).toEqual({ qty: 0, lh: 1, rh: 0 });
	expect(meta.fulfillmentAssignment.lines[0]?.quantity.qty).toBe(5);
});
test("packing rejects stale scope, unrelated items and excessive or wrong-axis quantities", () => {
	const valid = { uid: "a", quantity: { qty: 3, lh: 0, rh: 0 } };
	for (const lines of [
		[{ ...valid, uid: "other" }],
		[valid, valid],
		[{ ...valid, quantity: { qty: 6, lh: 0, rh: 0 } }],
		[{ ...valid, quantity: { qty: 0, lh: 1, rh: 0 } }],
		[{ ...valid, quantity: { qty: -1, lh: 0, rh: 0 } }],
	]) {
		expect(() =>
			validateFulfillmentPackingScope({
				meta,
				expectedScopeRevision: 2,
				lines,
			}),
		).toThrow();
	}
	expect(() =>
		validateFulfillmentPackingScope({
			meta,
			expectedScopeRevision: 1,
			lines: [valid],
		}),
	).toThrow("Refresh");
	expect(() =>
		validateFulfillmentPackingScope({
			meta: {},
			expectedScopeRevision: 1,
			lines: [valid],
		}),
	).toThrow("Review");
});
