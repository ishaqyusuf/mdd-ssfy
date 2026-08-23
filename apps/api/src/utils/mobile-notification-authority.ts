import type { Db } from "@gnd/db";
import type { NotificationJobInput } from "@notifications/schemas";

export const mobileNotificationChannels = [
	"job_task_configured",
	"sales_request_packing",
	"dispatch_packing_delay",
	"sales_dispatch_duplicate_alert",
	"sales_dispatch_packing_reset",
] as const;

type MobileNotificationChannel = (typeof mobileNotificationChannels)[number];
export type MobileNotificationInput = Extract<
	NotificationJobInput,
	{ channel: MobileNotificationChannel }
>;

export type MobileNotificationActor = {
	userId: number;
	can: {
		editJobs?: boolean;
		editOrders?: boolean;
		editPickup?: boolean;
		viewPacking?: boolean;
		viewDelivery?: boolean;
		viewPickup?: boolean;
	};
};

export async function authorizeMobileNotification(
	db: Db,
	input: MobileNotificationInput,
	actor: MobileNotificationActor,
) {
	if (!mobileNotificationChannels.includes(input.channel)) {
		throw new Error("This client notification channel is not supported.");
	}
	if (input.channel === "job_task_configured") {
		if (!actor.can.editJobs) {
			throw new Error(
				"You do not have permission to configure contractor jobs.",
			);
		}
		const job = await db.jobs.findFirst({
			where: { id: input.payload.jobId, deletedAt: null },
			select: { id: true, userId: true },
		});
		if (!job?.userId) throw new Error("The contractor job was not found.");
		return {
			channel: input.channel,
			payload: { jobId: job.id, contractorId: job.userId },
			recipientIds: [job.userId],
		} as const;
	}

	const dispatch = await db.orderDelivery.findFirst({
		where: { id: input.payload.dispatchId, deletedAt: null },
		select: {
			id: true,
			driverId: true,
			deliveryMode: true,
			dueDate: true,
			order: { select: { orderId: true } },
		},
	});
	if (!dispatch) throw new Error("The dispatch was not found.");
	const roleScoped = Boolean(
		actor.can.editOrders || actor.can.editPickup || actor.can.viewPacking,
	);
	const assignmentScoped = Boolean(
		(actor.can.viewDelivery || actor.can.viewPickup) &&
			dispatch.driverId === actor.userId,
	);
	if (!roleScoped && !assignmentScoped) {
		throw new Error(
			"Only the assigned driver or a dispatch manager may send this notification.",
		);
	}

	if (input.channel === "sales_request_packing") {
		if (input.payload.packItems?.dispatchId !== dispatch.id) {
			throw new Error("The packing request does not match this dispatch.");
		}
		return {
			channel: input.channel,
			payload: {
				...input.payload,
				orderNo: dispatch.order?.orderId || "-",
				dispatchId: dispatch.id,
				packItems: {
					...input.payload.packItems,
					dispatchId: dispatch.id,
				},
			},
			recipientIds: null,
		} as const;
	}
	if (input.channel === "dispatch_packing_delay") {
		return {
			channel: input.channel,
			payload: {
				...input.payload,
				orderNo: dispatch.order?.orderId || "-",
				dispatchId: dispatch.id,
			},
			recipientIds: null,
		} as const;
	}
	if (input.channel === "sales_dispatch_duplicate_alert") {
		return {
			channel: input.channel,
			payload: { dispatchId: dispatch.id },
			recipientIds: null,
		} as const;
	}
	return {
		channel: "sales_dispatch_packing_reset" as const,
		payload: {
			orderNo: dispatch.order?.orderId || undefined,
			dispatchId: dispatch.id,
			deliveryMode:
				dispatch.deliveryMode === "pickup" ||
				dispatch.deliveryMode === "delivery"
					? dispatch.deliveryMode
					: undefined,
			dueDate: dispatch.dueDate || undefined,
			driverId: dispatch.driverId || undefined,
		},
		recipientIds: null,
	} as const;
}
