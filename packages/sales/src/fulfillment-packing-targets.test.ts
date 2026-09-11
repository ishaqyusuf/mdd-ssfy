import { expect, test } from "bun:test";
import {
	capFulfillmentDeliverables,
	scopeFulfillmentPackingTargets,
} from "./fulfillment-packing-targets";
const matrix = (qty: number) => ({ qty, lh: 0, rh: 0 });
test("deliverable rows share a cap and preserve submission identity", () => {
	const rows = [
		{ submissionId: 1, qty: matrix(2) },
		{ submissionId: 2, qty: matrix(4) },
	];
	expect(capFulfillmentDeliverables(rows, matrix(3))).toEqual([
		{ submissionId: 1, qty: matrix(2) },
		{ submissionId: 2, qty: matrix(1) },
	]);
	expect(rows[1]?.qty.qty).toBe(4);
	expect(capFulfillmentDeliverables(rows, matrix(0))).toEqual([]);
});
test("deliverable handed capacity cannot spill between sides", () => {
	expect(
		capFulfillmentDeliverables(
			[
				{ submissionId: 1, qty: { qty: 4, lh: 4, rh: 0 } },
				{ submissionId: 2, qty: { qty: 4, lh: 0, rh: 4 } },
			],
			{ qty: 3, lh: 1, rh: 2 },
		),
	).toEqual([
		{ submissionId: 1, qty: { qty: 1, lh: 1, rh: 0 } },
		{ submissionId: 2, qty: { qty: 2, lh: 0, rh: 2 } },
	]);
});
const item = {
	uid: "a",
	totalQty: matrix(10),
	listedQty: matrix(2),
	packedQty: matrix(2),
	availableQty: matrix(8),
	deliverableQty: matrix(8),
};
const meta = {
	fulfillmentAssignment: {
		version: 1,
		revision: 1,
		selectionMode: "selected",
		lines: [{ uid: "a", quantity: matrix(5) }],
	},
};
test("five assigned targets five and exposes only three additional packing units", () => {
	const result = scopeFulfillmentPackingTargets(
		[item, { ...item, uid: "b", listedQty: matrix(0) }],
		meta,
	);
	expect(result).toHaveLength(1);
	expect(result[0]?.totalQty.qty).toBe(5);
	expect(result[0]?.availableQty.qty).toBe(3);
	expect(item.totalQty.qty).toBe(10);
});
test("missing assigned evidence and unrelated physical allocations require review", () => {
	expect(() => scopeFulfillmentPackingTargets([], meta)).toThrow("missing");
	expect(() =>
		scopeFulfillmentPackingTargets([item, { ...item, uid: "b" }], meta),
	).toThrow("outside");
	expect(scopeFulfillmentPackingTargets([item], {})).toEqual([item]);
});

test("duplicate manifest targets and physical overpacking cannot be hidden by clamping", () => {
	expect(() => scopeFulfillmentPackingTargets([item, item], meta)).toThrow(
		"Duplicate",
	);
	expect(() =>
		scopeFulfillmentPackingTargets([{ ...item, packedQty: matrix(6) }], meta),
	).toThrow("exceeds");
	expect(() =>
		scopeFulfillmentPackingTargets([{ ...item, listedQty: matrix(6) }], meta),
	).toThrow("exceeds");
});

test("handed targets keep total and exact axis capacity consistent", () => {
	const handedMeta = {
		fulfillmentAssignment: {
			...meta.fulfillmentAssignment,
			lines: [{ uid: "a", quantity: { qty: 0, lh: 2, rh: 3 } }],
		},
	};
	const result = scopeFulfillmentPackingTargets(
		[
			{
				...item,
				listedQty: { qty: 2, lh: 2, rh: 0 },
				packedQty: { qty: 2, lh: 2, rh: 0 },
				availableQty: { qty: 8, lh: 4, rh: 4 },
				deliverableQty: { qty: 8, lh: 4, rh: 4 },
			},
		],
		handedMeta,
	);
	expect(result[0]?.totalQty).toMatchObject({ qty: 5, lh: 2, rh: 3 });
	expect(result[0]?.availableQty).toMatchObject({ qty: 3, lh: 0, rh: 3 });
});
