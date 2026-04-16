import { db } from "@gnd/db";
import type { NotificationOptions } from "@notifications/base";
import {
	type NotificationJobInput,
	notificationJobSchema,
} from "@notifications/schemas";
import { logger, schemaTask, tasks } from "@trigger.dev/sdk/v3";

export const notification = schemaTask({
	id: "notification",
	schema: notificationJobSchema,
	machine: "micro",
	maxDuration: 60,
	queue: {
		concurrencyLimit: 5,
	},
	run: async (data) => {
		const { Notifications } = await import("@gnd/notifications");
		const notifications = new Notifications(db);
		const { channel, author, recipients, payload } = data as NotificationJobInput;
		if (channel === "job_task_configured") {
			const jobId = Number((payload as { jobId?: number })?.jobId);
			if (Number.isFinite(jobId) && jobId > 0) {
				await db.jobs.updateMany({
					where: {
						id: jobId,
						status: "Config Requested",
					},
					data: {
						status: "In Progress",
						statusDate: new Date(),
					},
				});
			}
		}
		logger.info("Triggering notification with data:", {
			channel,
			author,
			recipients,
			payload,
		});
		const notificationOptions: NotificationOptions = {
			author: {
				id: author.id,
				role: author.role === "customer" ? "customer" : "employee",
			},
			recipients:
				recipients?.map((recipient) => ({
					ids: recipient.ids,
					role: recipient.role,
				})) ?? undefined,
		};
		const result = await notifications.create(channel, payload, {
			...notificationOptions,
		});
		if (
			channel === "sales_dispatch_completed" &&
			(payload as { signature?: unknown }).signature
		) {
			const dispatchId = Number(
				(payload as { dispatchId?: number }).dispatchId,
			);
			const salesId = Number((payload as { salesId?: number }).salesId);
			if (Number.isFinite(dispatchId) && Number.isFinite(salesId)) {
				await tasks.trigger("attach-signed-dispatch-pdf", {
					dispatchId,
					salesId,
					notificationIds: result.activityIds || [],
					notificationId: result.activityIds?.[0] ?? null,
					authorId: author?.id ?? null,
				});
			}
		}
		return result;
	},
});
