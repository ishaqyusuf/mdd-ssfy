import {
	fulfillmentAssignmentScopeSchema,
	type FulfillmentAssignmentScope,
} from "./fulfillment-assignment-scope";
import type { projectFulfillmentQuantities } from "./fulfillment-quantities";

type Projection = ReturnType<typeof projectFulfillmentQuantities>;
const axes = ["qty", "lh", "rh"] as const;

/** Shared form preview and command validation. Commands must supply freshly locked evidence. */
export function buildFulfillmentAssignmentPlan(input: {
	projection: Projection;
	selectionMode: FulfillmentAssignmentScope["selectionMode"];
	selectedLines?: FulfillmentAssignmentScope["lines"];
	revision?: number;
}) {
	if (!input.projection.resolved)
		throw new Error(
			"Review existing fulfillment quantities before assigning this order.",
		);
	const available = new Map(
		input.projection.lines.map((line) => [line.uid, line.availableToAssign]),
	);
	const scope = fulfillmentAssignmentScopeSchema.parse({
		version: 1,
		revision: input.revision ?? 1,
		selectionMode: input.selectionMode,
		lines:
			input.selectionMode === "all_remaining"
				? input.projection.lines
						.filter((line) =>
							axes.some((axis) => line.availableToAssign[axis] > 0),
						)
						.map((line) => ({
							uid: line.uid,
							quantity: { ...line.availableToAssign },
						}))
				: (input.selectedLines ?? []),
	});
	if (!scope.lines.length)
		throw new Error("Select at least one quantity to fulfill.");
	let plannedQty = 0;
	for (const line of scope.lines) {
		const remainder = available.get(line.uid);
		if (!remainder)
			throw new Error("A selected item does not belong to this order.");
		if (!axes.some((axis) => line.quantity[axis] > 0))
			throw new Error("Remove items with no selected quantity.");
		if (axes.some((axis) => line.quantity[axis] > remainder[axis]))
			throw new Error("Selected quantity exceeds the available backlog.");
		plannedQty += axes.reduce((sum, axis) => sum + line.quantity[axis], 0);
	}
	return {
		scope,
		plannedQty,
		backlogQty:
			input.projection.lines.reduce(
				(sum, line) =>
					sum +
					line.availableToAssign.qty +
					line.availableToAssign.lh +
					line.availableToAssign.rh,
				0,
			) - plannedQty,
	};
}
