import { getTasks } from "@/actions/get-tasks";
import { createTRPCRouter, publicProcedure } from "../init";
import { z } from "zod";

export const tasksRouter = createTRPCRouter({
  get: publicProcedure.input(z.object({})).query(async ({ ctx }) => {
    return await getTasks();
  }),
});
