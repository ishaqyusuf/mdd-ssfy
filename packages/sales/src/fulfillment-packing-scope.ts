import { readFulfillmentAssignmentScope } from "./fulfillment-assignment-scope";
import type { FulfillmentQuantity } from "./fulfillment-quantities";

/** Validate actual load against persisted assignment; never infer a legacy scope. */
export function validateFulfillmentPackingScope(input: {
	meta: unknown;
	expectedScopeRevision: number;
	lines: Array<{ uid: string; quantity: FulfillmentQuantity }>;
}) {
	const { scope } = readFulfillmentAssignmentScope(input.meta);
	if (!scope) throw new Error("Review fulfillment quantities before packing.");
	if (scope.revision !== input.expectedScopeRevision)
		throw new Error("Fulfillment changed. Refresh before packing.");
	const planned = new Map(scope.lines.map((line) => [line.uid, line.quantity]));
	const actual = new Map<string, FulfillmentQuantity>();
	for (const line of input.lines) {
		if (actual.has(line.uid)) throw new Error("Duplicate packing item.");
		const limit = planned.get(line.uid);
		if (!limit) throw new Error("Item is not assigned to this fulfillment.");
		for (const axis of ["qty", "lh", "rh"] as const) {
			const value = line.quantity[axis];
			if (!Number.isSafeInteger(value) || value < 0 || value > limit[axis])
				throw new Error(
					"Packed quantity exceeds the assigned quantity or is invalid.",
				);
		}
		actual.set(line.uid, { ...line.quantity });
	}
	return scope.lines.map((line) => {
		const packed = actual.get(line.uid) ?? { qty: 0, lh: 0, rh: 0 };
		return {
			uid: line.uid,
			assigned: { ...line.quantity },
			packed,
			leftBehind: {
				qty: line.quantity.qty - packed.qty,
				lh: line.quantity.lh - packed.lh,
				rh: line.quantity.rh - packed.rh,
			},
		};
	});
}
