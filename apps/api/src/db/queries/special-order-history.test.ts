import { describe, expect, test } from "bun:test";

import { getSpecialOrderApprovalHistory } from "./special-order-approval";

describe("Special Order approval history projection", () => {
	test("preserves current, declined, superseded, and retry evidence without exposing signature storage", async () => {
		const db = {
			specialOrderApprovalRequest: {
				findMany: async () => [
					{
						id: "request-current",
						status: "ACTIVE",
						sentToEmail: "customer@example.com",
						deliveryStatus: "FAILED",
						lastDeliveryError: "Mailbox unavailable",
					},
					{
						id: "request-old",
						status: "CONSUMED",
						sentToEmail: "customer@example.com",
					},
				],
			},
			specialOrderApprovalEvidence: {
				findMany: async () => [
					{
						id: "approval-current",
						outcome: "APPROVED",
						signatureDocumentId: "private-signature-document",
						supersededAt: null,
						supersededReason: null,
					},
					{
						id: "approval-old",
						outcome: "APPROVED",
						signatureDocumentId: "private-old-signature",
						supersededAt: new Date("2026-08-12T10:00:00Z"),
						supersededReason: "Order revision changed",
					},
					{
						id: "decline-old",
						outcome: "DECLINED",
						signatureDocumentId: null,
						declineReason: "Wrong size",
						supersededAt: new Date("2026-08-12T11:00:00Z"),
						supersededReason: "Revised request issued",
					},
				],
			},
			specialOrderNotificationDelivery: {
				findMany: async () => [
					{
						id: "delivery-1",
						eventType: "REMOVED",
						customerStatus: "FAILED",
						staffStatus: "SENT",
						attempts: 1,
						lastError: "Customer email failed",
					},
				],
			},
		};

		const history = await getSpecialOrderApprovalHistory(
			{ db } as never,
			9232,
		);

		expect(history.requests.map((request) => request.status)).toEqual([
			"ACTIVE",
			"CONSUMED",
		]);
		expect(history.evidence).toEqual([
			expect.objectContaining({
				id: "approval-current",
				outcome: "APPROVED",
				hasSignature: true,
				supersededAt: null,
			}),
			expect.objectContaining({
				id: "approval-old",
				hasSignature: true,
				supersededReason: "Order revision changed",
			}),
			expect.objectContaining({
				id: "decline-old",
				outcome: "DECLINED",
				hasSignature: false,
				declineReason: "Wrong size",
			}),
		]);
		expect(JSON.stringify(history)).not.toContain("private-signature-document");
		expect(history.notificationDeliveries[0]).toMatchObject({
			customerStatus: "FAILED",
			staffStatus: "SENT",
			attempts: 1,
		});
	});
});
