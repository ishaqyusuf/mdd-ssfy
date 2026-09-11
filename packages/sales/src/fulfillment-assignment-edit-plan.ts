import { buildFulfillmentAssignmentPlan } from "./fulfillment-assignment-plan";
import {
	projectFulfillmentQuantities,
	type FulfillmentQuantityDelivery,
	type FulfillmentQuantityLine,
} from "./fulfillment-quantities";
import type { FulfillmentAssignmentScope } from "./fulfillment-assignment-scope";

/** Validate proposed edits against capacity excluding this fulfillment's own reservation. */
export function buildFulfillmentAssignmentEditPlan(input: {
	lines: FulfillmentQuantityLine[];
	deliveries: FulfillmentQuantityDelivery[];
	fulfillmentId: number;
	currentRevision: number;
	selectionMode: FulfillmentAssignmentScope["selectionMode"];
	selectedLines?: FulfillmentAssignmentScope["lines"];
}) {
	const current = input.deliveries.find(
		(delivery) => delivery.id === input.fulfillmentId,
	);
	if (!current || current.state !== "active")
		throw new Error("Only an active fulfillment can be edited.");
	const projection = projectFulfillmentQuantities({
		lines: input.lines,
		deliveries: input.deliveries,
		excludeDeliveryId: current.id,
	});
	const plan = buildFulfillmentAssignmentPlan({
		projection,
		selectionMode: input.selectionMode,
		selectedLines: input.selectedLines,
		revision: input.currentRevision + 1,
	});
	const proposed = new Map(
		plan.scope.lines.map((line) => [line.uid, line.quantity]),
	);
	const floors = new Map<string, { qty: number; lh: number; rh: number }>();
	for (const kind of ["packed", "delivered"] as const) {
		const sums = new Map<string, { qty: number; lh: number; rh: number }>();
		for (const line of current[kind]) {
			const sum = sums.get(line.uid) ?? { qty: 0, lh: 0, rh: 0 };
			for (const axis of ["qty", "lh", "rh"] as const)
				sum[axis] += line.quantity[axis];
			sums.set(line.uid, sum);
		}
		for (const [uid, sum] of sums) {
			const floor = floors.get(uid) ?? { qty: 0, lh: 0, rh: 0 };
			for (const axis of ["qty", "lh", "rh"] as const)
				floor[axis] = Math.max(floor[axis], sum[axis]);
			floors.set(uid, floor);
		}
	}
	for (const [uid, floor] of floors) {
		if (
			["qty", "lh", "rh"].some((key) => {
				const axis = key as keyof typeof floor;
				return (proposed.get(uid)?.[axis] ?? 0) < floor[axis];
			})
		)
			throw new Error(
				"Unpack or return the physical quantities before reducing this fulfillment.",
			);
	}
	return plan;
}
