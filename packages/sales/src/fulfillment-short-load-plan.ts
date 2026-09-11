import {
	readFulfillmentAssignmentScope,
	fulfillmentAssignmentScopeSchema,
} from "./fulfillment-assignment-scope";
import { validateFulfillmentPackingScope } from "./fulfillment-packing-scope";

/** Called only for a confirmed short load using physical quantities read under lock. */
export function buildFulfillmentShortLoadPlan(
	input: Parameters<typeof validateFulfillmentPackingScope>[0],
) {
	const lines = validateFulfillmentPackingScope(input);
	const original = readFulfillmentAssignmentScope(input.meta).scope!;
	const releasedQty = lines.reduce(
		(sum, line) =>
			sum + line.leftBehind.qty + line.leftBehind.lh + line.leftBehind.rh,
		0,
	);
	const scope =
		releasedQty === 0
			? original
			: fulfillmentAssignmentScopeSchema.parse({
					...original,
					revision: original.revision + 1,
					lines: lines
						.filter(
							(line) => line.packed.qty + line.packed.lh + line.packed.rh > 0,
						)
						.map((line) => ({ uid: line.uid, quantity: line.packed })),
				});
	return {
		changed: releasedQty > 0,
		releasedQty,
		originalScope: original,
		scope,
		lines,
	};
}
