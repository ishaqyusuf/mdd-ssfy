import { describe, expect, it } from "bun:test";
import {
	beginSpecialOrderApprovalEmailAttempt,
	completeSpecialOrderApprovalEmailAttempt,
} from "./special-order-email-ledger";

describe("Special Order approval Sales email ledger", () => {
	it("records reapproval delivery failures as retryable ledger evidence", async () => {
		const writes: unknown[] = [];
		const db = {
			salesEmailAttempt: {
				create: async ({ data }: { data: Record<string, unknown> }) => {
					writes.push(data);
					return { id: "attempt-1", ...data };
				},
				update: async ({ data }: { data: Record<string, unknown> }) => {
					writes.push(data);
					return data;
				},
			},
		};
		const attempt = await beginSpecialOrderApprovalEmailAttempt(db as never, {
			requestId: "request-1",
			salesId: 42,
			orderNo: "S-42",
			recipientEmail: "buyer@example.com",
			customerName: "Buyer",
			senderId: 9,
			salesRepId: 9,
			subject: "Review Special Order S-42",
			approvalUrl: "https://example.test/approval",
			expiresAt: new Date("2026-08-20T00:00:00.000Z"),
			isReapproval: true,
		});
		await completeSpecialOrderApprovalEmailAttempt(db as never, {
			attemptId: attempt.id,
			delivery: { status: "failed", errorMessage: "mail down" },
			completedAt: new Date("2026-08-13T00:00:00.000Z"),
		});
		expect(writes[0]).toMatchObject({
			status: "SENDING",
			emailKind: "special_order_approval_request",
			emailType: "reapproval",
		});
		expect(writes[1]).toMatchObject({
			status: "FAILED",
			errorMessage: "mail down",
		});
	});
});
