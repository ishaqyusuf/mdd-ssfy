import type { Db } from "@gnd/db";
import { toSpecialOrderJson } from "@gnd/sales/special-order";
import type { SpecialOrderApprovalDeliveryResult } from "@gnd/sales/special-order";

export async function beginSpecialOrderApprovalEmailAttempt(
	db: Db,
	input: {
		requestId: string;
		salesId: number;
		orderNo: string;
		recipientEmail: string;
		customerName: string;
		senderId: number | null;
		salesRepId: number | null;
		subject: string;
		approvalUrl: string;
		expiresAt: Date;
		isReapproval: boolean;
	},
) {
	return db.salesEmailAttempt.create({
		data: {
			status: "SENDING",
			emailKind: "special_order_approval_request",
			documentType: "order",
			emailType: input.isReapproval ? "reapproval" : "approval",
			subject: input.subject,
			recipientEmail: input.recipientEmail,
			customerName: input.customerName,
			customerEmail: input.recipientEmail,
			senderId: input.senderId,
			salesRepId: input.salesRepId,
			provider: "resend",
			providerStatus: "pending",
			salesIds: toSpecialOrderJson([input.salesId]),
			salesNos: toSpecialOrderJson([input.orderNo]),
			salesIdsText: String(input.salesId),
			salesNosText: input.orderNo,
			metadata: toSpecialOrderJson({
				requestId: input.requestId,
				approvalUrl: input.approvalUrl,
				expiresAt: input.expiresAt.toISOString(),
				source: "special-order-approval-request",
			}),
		},
	});
}

export async function completeSpecialOrderApprovalEmailAttempt(
	db: Db,
	input: {
		attemptId: string;
		delivery: SpecialOrderApprovalDeliveryResult;
		completedAt?: Date;
	},
) {
	const completedAt = input.completedAt ?? new Date();
	const delivery = input.delivery;
	return db.salesEmailAttempt.update({
		where: { id: input.attemptId },
		data:
			delivery.status === "sent"
				? {
						status: "SENT",
						providerMessageId: delivery.providerMessageId || null,
						providerStatus: delivery.providerStatus || "accepted",
						sentAt: completedAt,
						errorCode: null,
						errorMessage: null,
					}
				: delivery.status === "failed"
					? {
							status: "FAILED",
							providerStatus: delivery.providerStatus || "failed",
							errorMessage:
								delivery.errorMessage || "Email provider rejected the request.",
							failedAt: completedAt,
						}
					: {
							status: "SKIPPED",
							providerStatus: delivery.providerStatus || "skipped",
							errorMessage: delivery.errorMessage || null,
							skippedAt: completedAt,
						},
	});
}
