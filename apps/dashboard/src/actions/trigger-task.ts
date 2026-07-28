"use server";

import { taskNames } from "@jobs/schema";
import { tasks } from "@trigger.dev/sdk/v3";
import { actionClient } from "./safe-action";

import {
	logTaskRunStartFailure,
	logTriggeredTaskRun,
} from "@/lib/task-run-diagnostics.server";
import { z } from "zod";

function getErrorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	if (error && typeof error === "object" && "message" in error) {
		return String((error as { message?: unknown }).message || "");
	}
	return "Unable to start the background task.";
}

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
			const event = await tasks.trigger(params.taskName, {
				...(params?.payload || {}),
			});
			await logTriggeredTaskRun({
				taskName: params.taskName,
				payload: params.payload,
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
				errorMessage: getErrorMessage(error),
				id: null,
				publicAccessToken: null,
			};
		}
	});
