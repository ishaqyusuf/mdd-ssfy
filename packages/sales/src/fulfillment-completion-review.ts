import { readFulfillmentAssignmentScope } from "./fulfillment-assignment-scope";
import type { FulfillmentQuantity } from "./fulfillment-quantities";
import { validateFulfillmentPackingScope } from "./fulfillment-packing-scope";

/** Quantity review only. Inventory, evidence and actor eligibility remain command gates. */
export function buildFulfillmentCompletionReview(input: {
	meta: unknown;
	packed: Array<{ uid: string; quantity: FulfillmentQuantity }>;
}) {
	const parsed = readFulfillmentAssignmentScope(input.meta);
	if (!parsed.scope)
		return {
			scopeRevision: null,
			blockedReason: "Review fulfillment quantities before completing.",
			requiresShortLoadConfirmation: false,
			lines: [],
		};
	try {
		const lines = validateFulfillmentPackingScope({
			meta: input.meta,
			expectedScopeRevision: parsed.scope.revision,
			lines: input.packed,
		});
		return {
			scopeRevision: parsed.scope.revision,
			blockedReason: null,
			requiresShortLoadConfirmation: lines.some(
				(line) =>
					line.leftBehind.qty + line.leftBehind.lh + line.leftBehind.rh > 0,
			),
			lines,
		};
	} catch (error) {
		return {
			scopeRevision: parsed.scope.revision,
			blockedReason:
				error instanceof Error
					? error.message
					: "Review physical packing before completing.",
			requiresShortLoadConfirmation: false,
			lines: [],
		};
	}
}
