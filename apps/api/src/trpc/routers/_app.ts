import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { createTRPCRouter } from "../init";
import { backlogRouters } from "./backlogs.routes";
import { checkoutRouter } from "./checkout.route";
import { communityRouters } from "./community.route";
import { customerServiceRouter } from "./customer-service.route";
import { customerRouter } from "./customer.route";
import { dispatchRouters } from "./dispatch.route";
import { emailsRoute } from "./emails.route";
import { filterRouters } from "./filters.route";
import { google } from "./google-place.route";
import { hrmRoutes } from "./hrm.route";
import { inventoriesRouter } from "./inventories.route";
import { jobRoutes } from "./jobs.route";
import { newSalesFormRouter } from "./new-sales-form.route";
import { notesRouter } from "./notes.route";
import { orgs } from "./organization.route";
import { pageTabsRouter } from "./page-tabs.route";
import { printRouter } from "./print.route";
import { salesDashboardRouter } from "./sales-dashboard.route";
import { salesPaymentProcessorRouter } from "./sales-payment-processor.route";
import { salesRouter } from "./sales.route";
import { searchRouter } from "./search.route";
import { settingsRouter } from "./settings.route";
import { shoppingProductsRouter } from "./shopping-products.route";
import { siteActionsRoutes } from "./site-action.route";
import { squareTestRouter } from "./square-test.route";
import { storefrontRouter } from "./storefront.route";
import { taskEventsRouter } from "./task-events.route";
import { taskTriggerRouter } from "./task-trigger.route";
import { userRoutes } from "./user.route";
import { workOrderRouter } from "./work-order.route";
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
	salesPaymentProcessor: salesPaymentProcessorRouter,
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
