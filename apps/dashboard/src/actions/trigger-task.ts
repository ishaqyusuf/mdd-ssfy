"use server";

import { getUserErrorMessage } from "@gnd/errors";
import { taskNames } from "@jobs/schema";
import { tasks } from "@trigger.dev/sdk/v3";
import { getLoggedInProfile } from "./cache/get-loggedin-profile";
import { actionClient } from "./safe-action";

import {
	logTaskRunStartFailure,
	logTriggeredTaskRun,
} from "@/lib/task-run-diagnostics.server";
import { z } from "zod";

export const triggerTask = actionClient
	.schema(
		z.object({
			taskName: z.enum(taskNames),
			payload: z.any().nullable().optional(),
		}),
	)
	.metadata({
		name: "trigger-task",
	})
	.action(async ({ parsedInput: params }) => {
		try {
			let payload = params?.payload || {};
			if (params.taskName === "update-sales-control") {
				const actor = await getLoggedInProfile();
				if (!actor.userId) {
					throw new Error("Authentication is required.");
				}
				const input =
					payload && typeof payload === "object"
						? (payload as Record<string, unknown>)
						: {};
				const inputMeta =
					input.meta && typeof input.meta === "object"
						? (input.meta as Record<string, unknown>)
						: {};
				if (input.markAsCompleted && !actor.can?.markSalesOrderFulfilled) {
					throw new Error(
						"You do not have permission to mark sales orders fulfilled.",
					);
				}
				payload = {
					...input,
					meta: {
						...inputMeta,
						authorId: actor.userId,
						authorName: actor.name || "Employee",
						allowProductionSubmissionForOthers: Boolean(
							actor.can?.editProduction,
						),
					},
				};
			}
			const event = await tasks.trigger(params.taskName, payload);
			await logTriggeredTaskRun({
				taskName: params.taskName,
				payload,
				event,
			});

			return event;
		} catch (error) {
			await logTaskRunStartFailure({
				taskName: params.taskName,
				payload: params.payload,
				error,
			});

			return {
				errorMessage: getUserErrorMessage(error),
				id: null,
				publicAccessToken: null,
			};
		}
	});
