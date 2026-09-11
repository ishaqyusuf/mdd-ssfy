import { expect, test } from "bun:test";
import { buildFulfillmentAssignmentPlan } from "./fulfillment-assignment-plan";
import { projectFulfillmentQuantities } from "./fulfillment-quantities";
const projection = () =>
	projectFulfillmentQuantities({
		lines: [
			{
				uid: "item",
				salesItemId: 1,
				size: null,
				ordered: { qty: 10, lh: 0, rh: 0 },
			},
		],
		deliveries: [],
	});
test("selected half leaves immediate five-unit backlog", () => {
	const result = buildFulfillmentAssignmentPlan({
		projection: projection(),
		selectionMode: "selected",
		selectedLines: [{ uid: "item", quantity: { qty: 5, lh: 0, rh: 0 } }],
	});
	expect(result).toMatchObject({
		plannedQty: 5,
		backlogQty: 5,
		scope: { version: 1, revision: 1 },
	});
});
test("full mode derives all remaining from evidence instead of client lines", () => {
	const result = buildFulfillmentAssignmentPlan({
		projection: projection(),
		selectionMode: "all_remaining",
		selectedLines: [],
	});
	expect(result.plannedQty).toBe(10);
	expect(result.backlogQty).toBe(0);
});
test("invalid selections fail without clamping", () => {
	for (const quantity of [
		{ qty: 11, lh: 0, rh: 0 },
		{ qty: -1, lh: 0, rh: 0 },
		{ qty: 0, lh: 1, rh: 0 },
		{ qty: 0, lh: 0, rh: 0 },
	]) {
		expect(() =>
			buildFulfillmentAssignmentPlan({
				projection: projection(),
				selectionMode: "selected",
				selectedLines: [{ uid: "item", quantity }],
			}),
		).toThrow();
	}
});
test("empty, foreign and duplicate selected lines fail", () => {
	for (const lines of [
		[],
		[{ uid: "other", quantity: { qty: 1, lh: 0, rh: 0 } }],
		Array.from({ length: 2 }, () => ({
			uid: "item",
			quantity: { qty: 1, lh: 0, rh: 0 },
		})),
	]) {
		expect(() =>
			buildFulfillmentAssignmentPlan({
				projection: projection(),
				selectionMode: "selected",
				selectedLines: lines,
			}),
		).toThrow();
	}
});
test("unknown legacy scope prevents new planning", () => {
	const result = projection();
	result.resolved = false;
	expect(() =>
		buildFulfillmentAssignmentPlan({
			projection: result,
			selectionMode: "all_remaining",
		}),
	).toThrow("Review existing");
});
test("handed remainders stay on their exact axes", () => {
	const evidence = projectFulfillmentQuantities({
		lines: [
			{
				uid: "handed",
				salesItemId: 1,
				size: null,
				ordered: { qty: 0, lh: 4, rh: 6 },
			},
		],
		deliveries: [
			{
				id: 1,
				state: "active",
				planned: [{ uid: "handed", quantity: { qty: 0, lh: 3, rh: 2 } }],
				packed: [],
				delivered: [],
			},
		],
	});
	expect(
		buildFulfillmentAssignmentPlan({
			projection: evidence,
			selectionMode: "all_remaining",
		}).scope.lines[0]?.quantity,
	).toEqual({ qty: 0, lh: 1, rh: 4 });
});
