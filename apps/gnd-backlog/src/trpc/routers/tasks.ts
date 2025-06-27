import { createTRPCRouter, publicProcedure } from "../init";
import { z } from "zod";

export const tasksRouter = createTRPCRouter({
  get: publicProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx, input }) => {
      // return await getTasks();
      return {
        message: "Hello world",
        data: [],
      };
    }),
});
