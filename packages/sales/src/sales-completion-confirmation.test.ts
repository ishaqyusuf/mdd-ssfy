import { expect, test } from "bun:test";
import {
	markProductionCompletionStatusOnlySchema,
	markFulfillmentCompletionStatusOnlySchema,
	markSalesCompletionStatusOnlyBulkSchema,
} from "./sales-completion";
import { markSalesCompletionStatusOnlyFallbackSchema } from "./sales-completion-fallback";

const requestId = "00000000-0000-4000-8000-000000000021";
const revision = "a".repeat(64);

test("single and batch completion do not require a user-written reason", () => {
	for (const schema of [markProductionCompletionStatusOnlySchema, markFulfillmentCompletionStatusOnlySchema]) {
		expect(schema.safeParse({ salesOrderId: 1, requestId, expectedRevision: revision }).success).toBe(true);
		expect(schema.safeParse({ salesOrderId: 1, requestId, expectedRevision: revision,
			administrativeOverride: { expectedRevision: revision } }).success).toBe(true);
	}
	expect(markSalesCompletionStatusOnlyBulkSchema.safeParse({ salesOrderIds: [1], requestId,
		administrativeOverride: { expectedRevisions: [{ salesOrderId: 1, revision }] } }).success).toBe(true);
});

test("explicit fallback permits no reason but still requires per-order revisions", () => {
	const input = { milestone: "FULFILLMENT_COMPLETED", requestId, fullWorkflowRequestId: requestId,
		candidates: [{ salesOrderId: 1, expectedCompletionRevision: revision, expectedPipelineRevision: revision, administrativeOverrideRequired: true }] };
	expect(markSalesCompletionStatusOnlyFallbackSchema.safeParse(input).success).toBe(true);
	expect(markSalesCompletionStatusOnlyFallbackSchema.safeParse({ ...input, candidates: [{ salesOrderId: 1 }] }).success).toBe(false);
});
