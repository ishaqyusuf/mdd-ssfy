import { auth } from "@api/db/queries/user";
import {
	type MobileNotificationInput,
	authorizeMobileNotification,
	mobileNotificationChannels,
} from "@api/utils/mobile-notification-authority";
import { authorizeSalesControlTaskInput } from "@gnd/sales/sales-control/task-authorization";
import { updateSalesControlSchema } from "@gnd/sales/schema";
import { notificationJobSchema } from "@notifications/schemas";
import { NotificationService } from "@notifications/services/triggers";
import { runs, tasks } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

const clientTaskNames = ["update-sales-control"] as const;

async function prepareAuthenticatedPayload(
	props: {
		ctx: Parameters<typeof auth>[0] & { userId: number };
	},
	taskName: (typeof clientTaskNames)[number],
	payload: unknown,
) {
	if (taskName === "update-sales-control") {
		const input = updateSalesControlSchema.parse(payload);
		const actor = await auth(props.ctx);
		return authorizeSalesControlTaskInput(props.ctx.db, input, {
			userId: props.ctx.userId,
			can: actor.can,
		});
	}
	return payload;
}

export const taskTriggerRouter = createTRPCRouter({
	trigger: protectedProcedure
		.input(
			z.object({
				taskName: z.enum(clientTaskNames),
				payload: z.unknown(),
			}),
		)
		.mutation(async (props) => {
			const params = props.input;
			const payload = await prepareAuthenticatedPayload(
				props,
				params.taskName,
				params.payload,
			);
			const event = await tasks.trigger(params.taskName, payload);

			return event;
		}),
	notification: protectedProcedure
		.input(notificationJobSchema)
		.mutation(async (props) => {
			if (
				!mobileNotificationChannels.includes(
					props.input.channel as (typeof mobileNotificationChannels)[number],
				)
			) {
				throw new Error("This client notification channel is not supported.");
			}
			const actor = await auth(props.ctx);
			const prepared = await authorizeMobileNotification(
				props.ctx.db,
				props.input as MobileNotificationInput,
				{ userId: props.ctx.userId, can: actor.can },
			);
			const notification = new NotificationService(tasks, {
				db: props.ctx.db,
				userId: props.ctx.userId,
			});
			if (prepared.recipientIds) {
				notification.setEmployeeRecipients(...prepared.recipientIds);
			}
			switch (prepared.channel) {
				case "job_task_configured":
					return notification.send(prepared.channel, {
						payload: prepared.payload,
					});
				case "sales_request_packing":
					return notification.send(prepared.channel, {
						payload: prepared.payload,
					});
				case "dispatch_packing_delay":
					return notification.send(prepared.channel, {
						payload: prepared.payload,
					});
				case "sales_dispatch_duplicate_alert":
					return notification.send(prepared.channel, {
						payload: prepared.payload,
					});
				case "sales_dispatch_packing_reset":
					return notification.send(prepared.channel, {
						payload: prepared.payload,
					});
			}
		}),
	status: protectedProcedure
		.input(
			z.object({
				runId: z.string().min(1),
			}),
		)
		.query(async (props) => {
			const run = await runs.retrieve(props.input.runId);

			return {
				id: run.id,
				taskIdentifier: run.taskIdentifier,
				status: run.status,
				attemptCount: run.attemptCount,
				isQueued: run.isQueued,
				isExecuting: run.isExecuting,
				isCompleted: run.isCompleted,
				isSuccess: run.isSuccess,
				isFailed: run.isFailed,
				isCancelled: run.isCancelled,
				createdAt: run.createdAt,
				startedAt: run.startedAt ?? null,
				updatedAt: run.updatedAt,
				finishedAt: run.finishedAt ?? null,
				output: run.output ?? null,
				error: run.error ?? null,
			};
		}),
});
