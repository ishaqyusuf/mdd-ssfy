import { db } from "@gnd/db";
import type { NotificationJobInput } from "@notifications/schemas";
import { logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

const notificationTaskSchema = z.object({
	channel: z.string().min(1),
	author: z.object({
		id: z.number(),
		role: z.enum(["customer", "employee"]).default("employee"),
	}),
	recipients: z
		.array(
			z.object({
				ids: z.array(z.number()),
				role: z.enum(["customer", "employee", "address"]).optional(),
			}),
		)
		.optional()
		.nullable(),
	payload: z.record(z.string(), z.unknown()),
});

export const notification = schemaTask({
	id: "notification",
	schema: notificationTaskSchema,
	machine: "micro",
	maxDuration: 60,
	queue: {
		concurrencyLimit: 5,
	},
	run: async (data) => {
		const { Notifications } = await import("@gnd/notifications");
		const notifications = new Notifications(db);
		const notificationInput = data as NotificationJobInput;
		const { channel, author, recipients, payload } = notificationInput;
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
		return notifications.create(channel, payload, {
			author,
			recipients,
		});
	},
});
