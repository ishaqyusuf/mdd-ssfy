import type { TRPCContext } from "@api/trpc/init";
import { Notifications } from "@gnd/notifications";

export async function sendPackingReportNotification(
	ctx: TRPCContext,
	reportId: number,
	status: "PENDING" | "APPROVED" | "REJECTED",
	authorId: number,
	reviewerName?: string,
) {
	try {
		const report = await ctx.db.salesPackingReport.findUnique({
			where: { id: reportId },
			select: {
				id: true,
				orderDeliveryId: true,
				salesOrderItemId: true,
				submittedById: true,
				qty: true,
				lhQty: true,
				rhQty: true,
				note: true,
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
		const recipientId =
			status === "PENDING" ? report.order.salesRepId : report.submittedById;
		if (!recipientId) {
			return { sent: false as const, reason: "RECIPIENT_NOT_FOUND" };
		}
		const notification = new Notifications(ctx.db);
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
					report.productionSubmission.assignment?.salesItemControlUid ||
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
