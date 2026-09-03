import { beforeEach, describe, expect, it, mock } from "bun:test";

const createNotification = mock(async () => ({ id: 1 }));

import { sendPackingReportNotification } from "./packing-report-notification";

function context(input: {
	salesRepId: number;
	submittedById?: number;
	notifySalesRep?: boolean;
	existingBatchReportId?: number;
}) {
	return {
		db: {
			salesPackingReport: {
				findFirst: async () =>
					input.existingBatchReportId
						? { id: input.existingBatchReportId }
						: null,
				findUnique: async () => ({
					id: 5,
					orderDeliveryId: 41,
					salesOrderItemId: 81,
					salesItemControlUid: "door-81",
					submittedById: input.submittedById ?? 7,
					qty: 2,
					lhQty: 0,
					rhQty: 0,
					note: "Physically verified",
					order: { orderId: "09100PC", salesRepId: input.salesRepId },
					item: { description: "Entry Door", dykeDescription: null },
					productionSubmission: null,
					evidenceSnapshot:
						input.notifySalesRep === undefined
							? null
							: {
									policy: {
										enabled: true,
										allowAwaitingProductionSubmission: true,
										allowPendingMaterialReview: true,
										reviewMode: "BLOCK_DELIVERY_UNTIL_APPROVED",
										notifySalesRep: input.notifySalesRep,
										createProductionEvidenceOnApproval: true,
										revision: 1,
										changedAt: "2026-08-28T12:00:00.000Z",
									},
								},
				}),
			},
		},
	} as any;
}

describe("packing report notifications", () => {
	beforeEach(() => createNotification.mockClear());

	it("suppresses a pending notification when the actor is the order sales rep", async () => {
		await expect(
			sendPackingReportNotification(
				context({ salesRepId: 7 }),
				5,
				"PENDING",
				7,
				undefined,
				{ create: createNotification } as never,
			),
		).resolves.toEqual({
			sent: false,
			reason: "SELF_NOTIFICATION_SUPPRESSED",
		});
		expect(createNotification).not.toHaveBeenCalled();
	});

	it("notifies the order sales rep when a different rep or driver reports", async () => {
		await expect(
			sendPackingReportNotification(
				context({ salesRepId: 20 }),
				5,
				"PENDING",
				7,
				undefined,
				{ create: createNotification } as never,
			),
		).resolves.toEqual({ sent: true });
		expect(createNotification).toHaveBeenCalledTimes(1);
		expect(createNotification.mock.calls[0]?.[2]).toMatchObject({
			author: { id: 7, role: "employee" },
			recipients: [{ ids: [20], role: "employee" }],
			forceInAppRecipients: true,
		});
		expect(createNotification.mock.calls[0]?.[1]).toMatchObject({
			orderNo: "09100PC",
			dispatchId: 41,
			reviewId: 5,
			reviewStatus: "PENDING",
			itemUid: "door-81",
		});
	});

	it("suppresses the sales-rep notification when the report policy disables it", async () => {
		await expect(
			sendPackingReportNotification(
				context({ salesRepId: 20, notifySalesRep: false }),
				5,
				"PENDING",
				7,
				undefined,
				{ create: createNotification } as never,
			),
		).resolves.toEqual({
			sent: false,
			reason: "POLICY_NOTIFICATION_DISABLED",
		});
		expect(createNotification).not.toHaveBeenCalled();
	});

	it("sends one notification for a driver's pending dispatch batch", async () => {
		await expect(
			sendPackingReportNotification(
				context({ salesRepId: 20, existingBatchReportId: 4 }),
				5,
				"PENDING",
				7,
				undefined,
				{ create: createNotification } as never,
			),
		).resolves.toEqual({
			sent: false,
			reason: "BATCH_NOTIFICATION_EXISTS",
		});
		expect(createNotification).not.toHaveBeenCalled();
	});

	it("sends a decision notification back to the original reporter", async () => {
		await expect(
			sendPackingReportNotification(
				context({ salesRepId: 20, submittedById: 7 }),
				5,
				"APPROVED",
				20,
				"Sales Manager",
				{ create: createNotification } as never,
			),
		).resolves.toEqual({ sent: true });
		expect(createNotification.mock.calls[0]?.[2]).toMatchObject({
			recipients: [{ ids: [7], role: "employee" }],
		});
	});
});
