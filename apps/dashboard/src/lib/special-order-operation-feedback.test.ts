import { describe, expect, test } from "bun:test";

import {
	formatSpecialOrderOperationWarning,
	getSpecialOrderOperationWarnings,
} from "./special-order-operation-feedback";

describe("Special Order dashboard operation feedback", () => {
	test("reads server warning metadata and produces the staff-facing action", () => {
		const warnings = getSpecialOrderOperationWarnings({
			specialOrderOperation: {
				warnings: [
					{
						code: "SPECIAL_ORDER_APPROVAL_REQUIRED",
						enforcementMode: "WARNING_ONLY",
						message: "Server-owned warning",
						operation: "PACKING",
						orderId: "09232PC",
						recommendedAction: "Request customer approval from Sales.",
						status: "Reapproval Required",
					},
				],
			},
		});

		expect(warnings.length).toBe(1);
		expect(formatSpecialOrderOperationWarning(warnings[0]!)).toEqual({
			description:
				"Server-owned warning Open order 09232PC in Sales and request customer approval.",
			title: "Special Order packing warning",
		});
	});

	test("rejects malformed or non-warning mutation data", () => {
		expect(getSpecialOrderOperationWarnings(null)).toEqual([]);
		expect(
			getSpecialOrderOperationWarnings({
				specialOrderOperation: { warnings: [{ code: "OTHER" }] },
			}),
		).toEqual([]);
	});
});
