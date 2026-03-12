import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { backlogRouters } from "./backlogs.routes";
import { createTRPCRouter } from "../init";
import { salesRouter } from "./sales.route";
import { notesRouter } from "./notes.route";
import { hrmRoutes } from "./hrm.route";
import { siteActionsRoutes } from "./site-action.route";
import { searchRouter } from "./search.route";
import { emailsRoute } from "./emails.route";
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
import { taskTriggerRouter } from "./task-trigger.route";
import { customerServiceRouter } from "./customer-service.route";
import { checkoutRouter } from "./checkout.route";
import { orgs } from "./organization.route";
import { squareTestRouter } from "./square-test.route";
import { printRouter } from "./print.route";
import { workOrderRouter } from "./work-order.route";
import { jobRoutes } from "./jobs.route";
import { settingsRouter } from "./settings.route";
import { taskEventsRouter } from "./task-events.route";
import { newSalesFormRouter } from "./new-sales-form.route";
import { pageTabsRouter } from "./page-tabs.route";
// import { studentsRouter } from "./students";
// import { subjectsRouter } from "./subjects";
export const appRouter = createTRPCRouter({
  // students: studentsRouter,
  backlogs: backlogRouters,
  checkout: checkoutRouter,
  community: communityRouters,
  customerService: customerServiceRouter,
  customers: customerRouter,
  dispatch: dispatchRouters,
  emails: emailsRoute,
  filters: filterRouters,
  google: google,
  hrm: hrmRoutes,
  inventories: inventoriesRouter,
  jobs: jobRoutes,
  orgs,
  pageTabs: pageTabsRouter,
  notes: notesRouter,
  newSalesForm: newSalesFormRouter,
  print: printRouter,
  sales: salesRouter,
  salesDashboard: salesDashboardRouter,
  search: searchRouter,
  settings: settingsRouter,
  storefront: storefrontRouter,
  shoppingProducts: shoppingProductsRouter,
  siteActions: siteActionsRoutes,
  squareTest: squareTestRouter,
  taskTrigger: taskTriggerRouter,
  taskEvents: taskEventsRouter,
  user: userRoutes,
  workOrder: workOrderRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;

export { db } from "@gnd/db";
