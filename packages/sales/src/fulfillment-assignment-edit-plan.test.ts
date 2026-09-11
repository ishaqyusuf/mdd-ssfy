import { expect, test } from "bun:test";
import { buildFulfillmentAssignmentEditPlan } from "./fulfillment-assignment-edit-plan";
const quantity = (qty: number) => ({ qty, lh: 0, rh: 0 });
const line = (qty: number) => ({ uid: "item", quantity: quantity(qty) });
const input = {
	lines: [{ uid: "item", salesItemId: 1, size: null, ordered: quantity(10) }],
	deliveries: [
		{
			id: 1,
			state: "active" as const,
			planned: [line(5)],
			packed: [line(2)],
			delivered: [],
		},
		{
			id: 2,
			state: "active" as const,
			planned: [line(3)],
			packed: [],
			delivered: [],
		},
	],
	fulfillmentId: 1,
	currentRevision: 1,
	selectionMode: "selected" as const,
};
test("edit capacity includes own reservation but excludes other fulfillments", () => {
	const plan = buildFulfillmentAssignmentEditPlan({
		...input,
		selectedLines: [line(7)],
	});
	expect(plan.plannedQty).toBe(7);
	expect(plan.backlogQty).toBe(0);
	expect(plan.scope.revision).toBe(2);
	expect(() =>
		buildFulfillmentAssignmentEditPlan({ ...input, selectedLines: [line(8)] }),
	).toThrow();
});
test("safe reduction releases demand but cannot cross physical floor", () => {
	expect(
		buildFulfillmentAssignmentEditPlan({ ...input, selectedLines: [line(2)] })
			.backlogQty,
	).toBe(5);
	expect(() =>
		buildFulfillmentAssignmentEditPlan({ ...input, selectedLines: [line(1)] }),
	).toThrow("Unpack or return");
});
test("full mode claims available capacity without taking another fulfillment's units", () => {
	expect(
		buildFulfillmentAssignmentEditPlan({
			...input,
			selectionMode: "all_remaining",
		}).plannedQty,
	).toBe(7);
});
test("completed fulfillment cannot be edited", () => {
	expect(() =>
		buildFulfillmentAssignmentEditPlan({
			...input,
			deliveries: [{ ...input.deliveries[0]!, state: "completed" }],
			selectedLines: [line(3)],
		}),
	).toThrow("Only an active");
});
