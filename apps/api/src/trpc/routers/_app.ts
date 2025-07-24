import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { backlogRouters } from "./backlogs";
import { createTRPCRouter } from "../init";
import { salesRouter } from "./sales.route";
import { notesRouter } from "./notes.route";
import { hrmRoutes } from "./hrm.route";
import { siteActionsRoutes } from "./site-action.route";
import { searchRouter } from "./search.route";
import { emailsRoute } from "./emails.route";
import { checkoutRouters } from "./checkout.route";
import { dispatchRouters } from "./dispatch.route";
import { userRoutes } from "./user.route";
import { filterRouters } from "./filters.route";
import { salesDashboardRouter } from "./sales-dashboard.route";
import { customerRouter } from "./customer.route";
import { shoppingProductsRouter } from "./shopping-products.route";
// import { studentsRouter } from "./students";
// import { subjectsRouter } from "./subjects";
export const appRouter = createTRPCRouter({
  // students: studentsRouter,
  salesDashboard: salesDashboardRouter,
  filters: filterRouters,
  checkout: checkoutRouters,
  dispatch: dispatchRouters,
  backlogs: backlogRouters,
  emails: emailsRoute,
  hrm: hrmRoutes,
  notes: notesRouter,
  sales: salesRouter,
  search: searchRouter,
  siteActions: siteActionsRoutes,
  user: userRoutes,
  customers: customerRouter,
  shoppingProducts: shoppingProductsRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
