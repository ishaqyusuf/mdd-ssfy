import { getTasks } from "@/actions/get-tasks";
import { createTRPCRouter, publicProcedure } from "../init";

export const tasksRouter = createTRPCRouter({
  get: publicProcedure.query(async ({ ctx }) => {
    return await getTasks();
  }),
});
