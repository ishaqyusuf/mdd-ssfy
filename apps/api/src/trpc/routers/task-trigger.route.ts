import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import { runs, tasks } from "@trigger.dev/sdk/v3";

export const taskTriggerRouter = createTRPCRouter({
  trigger: publicProcedure
    .input(
      z.object({
        taskName: z.string(),
        payload: z.any(),
      }),
    )
    .mutation(async (props) => {
      const params = props.input;
      const event = await tasks.trigger(params.taskName, {
        ...(params?.payload || {}),
      });

      return event;
    }),
  status: publicProcedure
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
