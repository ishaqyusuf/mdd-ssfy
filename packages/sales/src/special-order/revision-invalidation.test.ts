import { describe, expect, it } from "bun:test";
import { invalidateSpecialOrderRevisionsForCustomerChange } from "./revision-invalidation";

describe("Special Order direct customer-change invalidation", () => {
	it("revokes links, supersedes evidence, and requires reapproval", async () => {
		const calls: Array<[string, unknown]> = [];
		const db = {
			salesOrders: {
				findMany: async () => [
					{
						id: 42,
						specialOrderRevision: "old-revision",
						specialOrderStatus: "CUSTOMER_APPROVED",
						currentSpecialOrderApprovalId: "evidence-1",
					},
				],
				update: async (value: unknown) => calls.push(["order", value]),
			},
			specialOrderApprovalRequest: {
				updateMany: async (value: unknown) => calls.push(["request", value]),
			},
			specialOrderApprovalEvidence: {
				updateMany: async (value: unknown) => calls.push(["evidence", value]),
			},
			salesHistory: {
				create: async (value: unknown) => calls.push(["history", value]),
			},
		};

		const result = await invalidateSpecialOrderRevisionsForCustomerChange(
			db as never,
			{
				customerId: 7,
				reason: "Canonical customer email changed",
				actorUserId: 9,
				authorName: "Salesperson",
				changeFingerprint: { email: "new@example.com" },
			},
		);

		expect(result.invalidatedOrderCount).toBe(1);
		expect(calls.find(([name]) => name === "request")?.[1]).toMatchObject({
			data: { status: "REVOKED" },
		});
		expect(calls.find(([name]) => name === "order")?.[1]).toMatchObject({
			data: {
				specialOrderStatus: "REAPPROVAL_REQUIRED",
				currentSpecialOrderApprovalId: null,
				currentSpecialOrderRequestId: null,
			},
		});
		expect(calls.find(([name]) => name === "history")?.[1]).toMatchObject({
			data: { name: "Special Order customer-visible details changed" },
		});
	});
});
