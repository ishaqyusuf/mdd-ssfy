import { describe, expect, test } from "bun:test";

import {
	attachSpecialOrderOperationFeedback,
	captureSpecialOrderOperationDecision,
	createSpecialOrderOperationFeedbackCollector,
	withSpecialOrderOperationFeedback,
} from "./special-order-operation-feedback";

const warningDecision = {
	allowed: true,
	approvalRequired: true,
	blocked: false,
	code: null,
	enforcementMode: "WARNING_ONLY" as const,
	operation: "PRODUCTION" as const,
	orderNo: "09232PC",
	orderRevision: "private-revision-hash",
	salesOrderId: 9232,
	statusLabel: "Signature Pending",
	warning: true,
};

describe("Special Order operation feedback", () => {
	test("attaches safe, actionable warning metadata without exposing revisions", () => {
		const result = attachSpecialOrderOperationFeedback(
			{ ok: true },
			[warningDecision],
		);

		expect(result).toEqual({
			ok: true,
			specialOrderOperation: {
				warnings: [
					{
						code: "SPECIAL_ORDER_APPROVAL_REQUIRED",
						enforcementMode: "WARNING_ONLY",
						message:
							"Order 09232PC is a Special Order with status “Signature Pending”. Production continued in Warning Only mode. Request customer approval from Sales.",
						operation: "PRODUCTION",
						orderId: "09232PC",
						recommendedAction: "Request customer approval from Sales.",
						status: "Signature Pending",
					},
				],
			},
		});
		expect(JSON.stringify(result)).not.toContain("private-revision-hash");
	});

	test("deduplicates warnings while preserving distinct orders and operations", () => {
		const collector = createSpecialOrderOperationFeedbackCollector();
		collector.capture(warningDecision);
		collector.capture(warningDecision);
		collector.capture({ ...warningDecision, operation: "PACKING" });

		expect(collector.warnings).toHaveLength(2);
	});

	test("leaves existing response contracts untouched when no warning occurred", () => {
		const response = { id: 42, status: "completed" };
		expect(attachSpecialOrderOperationFeedback(response, [])).toBe(response);
		expect(
			attachSpecialOrderOperationFeedback(response, [
				{ ...warningDecision, approvalRequired: false, warning: false },
			]),
		).toBe(response);
	});

	test("decorates tRPC success data from the request-scoped collector", async () => {
		const result = await withSpecialOrderOperationFeedback(async () => {
			captureSpecialOrderOperationDecision(warningDecision);
			return { ok: true as const, data: { updated: 1 } };
		});

		expect(result).toMatchObject({
			ok: true,
			data: {
				updated: 1,
				specialOrderOperation: {
					warnings: [{ operation: "PRODUCTION", orderId: "09232PC" }],
				},
			},
		});
	});
});
