import { expect, test } from "bun:test";
import { projectBacklogEvidence } from "./fulfillment-backlog-query";
const quantity = { qty: 0, lh: 3, rh: 2 };
const order = {
	id: 1,
	itemControls: [
		{
			uid: "door",
			orderItemId: 11,
			title: "Door",
			shippable: true,
			qtyControls: [{ qty: 10, lh: 5, rh: 5, total: 10 }],
		},
	],
	completionRecords: [],
	deliveries: [
		{
			id: 10,
			status: "queue",
			meta: {
				fulfillmentAssignment: {
					version: 1,
					revision: 1,
					selectionMode: "selected",
					lines: [{ uid: "door", quantity }],
				},
			},
			_count: { stockAllocations: 0 },
			items: [],
		},
	],
};
test("backlog query evidence includes partial assignment before delivery", () => {
	expect(projectBacklogEvidence(order).isBacklog).toBe(true);
	expect(projectBacklogEvidence(order).projection.backlogQty).toBe(5);
});
test("full reservation is not backlog even if unpacked", () => {
	const full = {
		...order,
		deliveries: [
			{
				...order.deliveries[0]!,
				meta: {
					fulfillmentAssignment: {
						version: 1,
						revision: 1,
						selectionMode: "all_remaining",
						lines: [{ uid: "door", quantity: { qty: 0, lh: 5, rh: 5 } }],
					},
				},
			},
		],
	};
	expect(projectBacklogEvidence(full).isBacklog).toBe(false);
});
test("unassigned orders and cancelled-only reservations are not backlog", () => {
	expect(projectBacklogEvidence({ ...order, deliveries: [] }).isBacklog).toBe(
		false,
	);
	expect(
		projectBacklogEvidence({
			...order,
			deliveries: [{ ...order.deliveries[0]!, status: "cancelled" }],
		}).projection.backlogQty,
	).toBe(0);
});
test("missing controls and unknown legacy reservations do not claim available backlog", () => {
	expect(projectBacklogEvidence({ ...order, itemControls: [] }).isBacklog).toBe(
		false,
	);
	expect(
		projectBacklogEvidence({
			...order,
			deliveries: [{ ...order.deliveries[0]!, meta: {} }],
		}).isBacklog,
	).toBe(false);
});
test("status-only completion stays outside the operational backlog", () => {
	expect(
		projectBacklogEvidence({
			...order,
			completionRecords: [
				{ id: "completion-1", completionMethod: "STATUS_ONLY" },
			],
		}).isBacklog,
	).toBe(false);
});

test("incomplete line evidence blocks the shared projection as well as the filter", () => {
	const evidence = {
		...order,
		deliveries: [],
		itemControls: [
			...order.itemControls,
			{
				...order.itemControls[0]!,
				uid: "missing",
				orderItemId: 12,
				qtyControls: [],
			},
		],
	};
	const result = projectBacklogEvidence(evidence);
	expect(result.isBacklog).toBe(false);
	expect(result.projection.resolved).toBe(false);
	expect(result.projection.backlogQty).toBe(0);
	expect(
		result.projection.lines.every(
			(line) =>
				line.availableToAssign.qty +
					line.availableToAssign.lh +
					line.availableToAssign.rh ===
				0,
		),
	).toBe(true);
});
