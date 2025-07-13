import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { backlogRouters } from "./backlogs";
import { createTRPCRouter } from "../init";
import { salesRouter } from "./sales.route";
import { notesRouter } from "./notes.route";
import { hrmRoutes } from "./hrm.route";
import { siteActionsRoutes } from "./site-action.route";
import { searchRouter } from "./search.route";
import { emailsRoute } from "./emails.route";
// import { studentsRouter } from "./students";
// import { subjectsRouter } from "./subjects";
export const appRouter = createTRPCRouter({
  // students: studentsRouter,
  backlogs: backlogRouters,
  emails: emailsRoute,
  hrm: hrmRoutes,
  notes: notesRouter,
  sales: salesRouter,
  search: searchRouter,
  siteActions: siteActionsRoutes,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
