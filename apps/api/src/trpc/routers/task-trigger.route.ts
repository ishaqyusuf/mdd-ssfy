import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import { tasks } from "@trigger.dev/sdk/v3";

export const taskTriggerRouter = createTRPCRouter({
  trigger: publicProcedure
    .input(
      z.object({
        taskName: z.string(),
        payload: z.any(),
      })
    )
    .mutation(async (props) => {
      const params = props.input;
      const event = await tasks.trigger(params.taskName, {
        ...(params?.payload || {}),
      });
      return event;
    }),
});
