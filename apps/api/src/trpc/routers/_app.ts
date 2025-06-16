import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "../init";
import { studentsRouter } from "./students";
import { subjectsRouter } from "./subjects";
export const appRouter = createTRPCRouter({
  students: studentsRouter,
  subjects: subjectsRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
