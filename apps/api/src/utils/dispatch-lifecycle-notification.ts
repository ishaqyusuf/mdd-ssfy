import type { TRPCContext } from "@api/trpc/init";
import { Notifications } from "@gnd/notifications";

export type DispatchLifecycleNotificationChannel =
	| "sales_dispatch_assigned"
	| "sales_dispatch_unassigned"
	| "sales_dispatch_date_updated"
	| "sales_dispatch_approval_pending_released"
	| "sales_dispatch_queued"
	| "sales_dispatch_in_progress"
	| "sales_dispatch_completed"
	| "sales_dispatch_cancelled"
	| "sales_dispatch_trip_canceled";

export type DispatchLifecycleNotificationPayload = {
	orderNo?: string | null;
	dispatchId: number;
	deliveryMode?: "pickup" | "delivery" | null;
	dueDate?: Date | null;
	driverId?: number | null;
};

export async function sendDispatchLifecycleNotification(
	db: TRPCContext["db"],
	authorId: number,
	recipientId: number | null | undefined,
	channel: DispatchLifecycleNotificationChannel,
	payload: DispatchLifecycleNotificationPayload,
) {
	if (!recipientId) return { sent: false as const, reason: "NO_RECIPIENT" };

	try {
		const notifications = new Notifications(db);
		const result = await notifications.create(
			channel,
			{
				orderNo: payload.orderNo || undefined,
				dispatchId: payload.dispatchId,
				deliveryMode: payload.deliveryMode || undefined,
				dueDate: payload.dueDate || undefined,
				driverId: payload.driverId || undefined,
			},
			{
				author: { id: authorId, role: "employee" },
				recipients: [{ ids: [recipientId], role: "employee" }],
				includeChannelSubscribers: false,
				allowFallbackRecipient: false,
				forceInAppRecipients: true,
			},
		);
		if (!result.activities) {
			return {
				sent: false as const,
				reason: "NO_ACTIVITY",
				message: "The notification recipient could not be resolved.",
			};
		}
		return { sent: true as const, activityIds: result.activityIds || [] };
	} catch (error) {
		console.warn("Unable to send dispatch lifecycle notification", error);
		return {
			sent: false as const,
			reason: "DELIVERY_FAILED",
			message: error instanceof Error ? error.message : String(error),
		};
	}
}
