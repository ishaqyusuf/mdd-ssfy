"use server";
import { taskNames } from "@jobs/schema";
import { actionClient } from "./safe-action";
import { tasks } from "@trigger.dev/sdk/v3";

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
    .action(async ({ parsedInput: params, ctx }) => {
        const event = await tasks.trigger(params.taskName, {
            ...(params?.payload || {}),
        });

        return event;
    });

