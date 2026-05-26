"use server";

import { getServerAuthSession } from "@/lib/auth/session";
import { runs } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { actionClient } from "./safe-action";

export const cancelTaskRunAction = actionClient
    .schema(
        z.object({
            runId: z.string().min(1),
        }),
    )
    .metadata({
        name: "cancel-task-run",
    })
    .action(async ({ parsedInput }) => {
        const session = await getServerAuthSession();

        if (!session?.user?.id) {
            throw new Error("You must be signed in to cancel a task.");
        }

        try {
            const run = await runs.cancel(parsedInput.runId);

            return {
                id: run.id,
            };
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(error.message || "Unable to cancel task.");
            }

            throw new Error("Unable to cancel task.");
        }
    });
