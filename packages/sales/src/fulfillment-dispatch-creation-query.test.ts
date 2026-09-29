import { expect, test } from "bun:test";
import { projectBacklogEvidence } from "./fulfillment-backlog-query";
import { projectDispatchCreationEvidence } from "./fulfillment-dispatch-creation-query";

const order = {
	id: 1,
	itemControls: [
		{
			uid: "shelf-1",
			orderItemId: 10,
			title: "Shelf",
			shippable: true,
			qtyControls: [{ qty: 2, lh: 0, rh: 0, total: 2 }],
		},
	],
	completionRecords: [],
	deliveries: [],
};
const itemControl = order.itemControls[0];

test("first-dispatch candidate is distinct from dispatch backlog", () => {
	expect(projectBacklogEvidence(order).isBacklog).toBe(false);
	expect(projectDispatchCreationEvidence(order)).toBe(true);
});

test("active dispatches and incomplete quantity evidence cannot be selected", () => {
	expect(
		projectDispatchCreationEvidence({
			...order,
			deliveries: [
				{
					id: 20,
					status: "queue",
					deliveryMode: "pickup",
					meta: {},
					_count: { stockAllocations: 0 },
					items: [],
				},
			],
		}),
	).toBe(false);
	expect(projectDispatchCreationEvidence({ ...order, itemControls: [] })).toBe(
		false,
	);
	expect(
		projectDispatchCreationEvidence({
			...order,
			itemControls: [{ ...itemControl, qtyControls: [] }],
		}),
	).toBe(false);
});

test("cancelled dispatch can be replaced, while completed or empty work cannot", () => {
	expect(
		projectDispatchCreationEvidence({
			...order,
			deliveries: [
				{
					id: 20,
					status: "cancelled",
					deliveryMode: "pickup",
					meta: {},
					_count: { stockAllocations: 0 },
					items: [],
				},
			],
		}),
	).toBe(true);
	expect(
		projectDispatchCreationEvidence({
			...order,
			completionRecords: [{ id: "done", completionMethod: "STATUS_ONLY" }],
		}),
	).toBe(false);
	expect(
		projectDispatchCreationEvidence({
			...order,
			itemControls: [
				{ ...itemControl, qtyControls: [{ qty: 0, lh: 0, rh: 0, total: 0 }] },
			],
		}),
	).toBe(false);
});
