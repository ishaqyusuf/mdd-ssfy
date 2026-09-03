import type { TRPCContext } from "@api/trpc/init";
import { Notifications } from "@gnd/notifications";
import { guardedPackingPolicyFromEvidenceSnapshot } from "@gnd/settings";

export async function sendPackingReportNotification(
	ctx: TRPCContext,
	reportId: number,
	status: "PENDING" | "APPROVED" | "REJECTED",
	authorId: number,
	reviewerName?: string,
	notificationClient?: Pick<Notifications, "create">,
) {
	try {
		const report = await ctx.db.salesPackingReport.findUnique({
			where: { id: reportId },
			select: {
				id: true,
				orderDeliveryId: true,
				salesOrderItemId: true,
				salesItemControlUid: true,
				submittedById: true,
				qty: true,
				lhQty: true,
				rhQty: true,
				note: true,
				evidenceSnapshot: true,
				order: { select: { orderId: true, salesRepId: true } },
				item: { select: { description: true, dykeDescription: true } },
				productionSubmission: {
					select: {
						assignment: { select: { salesItemControlUid: true } },
					},
				},
			},
		});
		if (!report) return { sent: false as const, reason: "REPORT_NOT_FOUND" };
		if (
			status === "PENDING" &&
			!guardedPackingPolicyFromEvidenceSnapshot(report.evidenceSnapshot)
				.notifySalesRep
		) {
			return { sent: false as const, reason: "POLICY_NOTIFICATION_DISABLED" };
		}
		if (status === "PENDING") {
			const existingBatchReport = await ctx.db.salesPackingReport.findFirst({
				where: {
					id: { lt: report.id },
					orderDeliveryId: report.orderDeliveryId,
					submittedById: authorId,
					status: "PENDING",
				},
				select: { id: true },
			});
			if (existingBatchReport) {
				return { sent: false as const, reason: "BATCH_NOTIFICATION_EXISTS" };
			}
		}
		const recipientId =
			status === "PENDING" ? report.order.salesRepId : report.submittedById;
		if (!recipientId) {
			return { sent: false as const, reason: "RECIPIENT_NOT_FOUND" };
		}
		if (recipientId === authorId) {
			return { sent: false as const, reason: "SELF_NOTIFICATION_SUPPRESSED" };
		}
		const notification = notificationClient ?? new Notifications(ctx.db);
		await notification.create(
			"dispatch_packing_delay",
			{
				orderNo: report.order.orderId || String(report.orderDeliveryId),
				dispatchId: report.orderDeliveryId,
				reviewId: report.id,
				reviewStatus: status,
				reviewerName,
				salesItemId: report.salesOrderItemId,
				itemUid:
					report.salesItemControlUid ||
					report.productionSubmission?.assignment?.salesItemControlUid ||
					`item-${report.salesOrderItemId}`,
				itemName:
					report.item.description ||
					report.item.dykeDescription ||
					`Item #${report.salesOrderItemId}`,
				pendingQty: {
					qty: report.qty,
					lh: report.lhQty,
					rh: report.rhQty,
				},
				note: report.note || undefined,
			},
			{
				author: { id: authorId, role: "employee" },
				recipients: [{ ids: [recipientId], role: "employee" }],
				includeChannelSubscribers: false,
				allowFallbackRecipient: false,
				forceInAppRecipients: true,
			},
		);
		return { sent: true as const };
	} catch (error) {
		console.warn("Unable to send guarded packing notification", error);
		return { sent: false as const, reason: "NOTIFICATION_FAILED" };
	}
}
