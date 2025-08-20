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
import { google } from "./google-place.route";
import { inventoriesRouter } from "./inventories.route";
import { communityRouters } from "./community.route";
import { storefrontRouter } from "./storefront.route";
// import { studentsRouter } from "./students";
// import { subjectsRouter } from "./subjects";
export const appRouter = createTRPCRouter({
  // students: studentsRouter,
  backlogs: backlogRouters,
  checkout: checkoutRouters,
  community: communityRouters,
  customers: customerRouter,
  dispatch: dispatchRouters,
  emails: emailsRoute,
  filters: filterRouters,
  google: google,
  inventories: inventoriesRouter,
  hrm: hrmRoutes,
  notes: notesRouter,
  sales: salesRouter,
  salesDashboard: salesDashboardRouter,
  search: searchRouter,
  storefront: storefrontRouter,
  shoppingProducts: shoppingProductsRouter,
  siteActions: siteActionsRoutes,
  user: userRoutes,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
