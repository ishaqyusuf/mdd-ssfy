import { salesRepDashboardPeriodSchema } from "@api/schemas/sales-rep-dashboard";
import { requireAnyOperationalPermission } from "@api/utils/operational-route-access";
import {
	getSalesRepDashboardActivity,
	getSalesRepDashboardOverview,
	getSalesRepDashboardTrend,
} from "../../db/queries/sales-rep-dashboard";
import { createTRPCRouter, protectedProcedure } from "../init";

const SALES_REP_DASHBOARD_PERMISSIONS = [
	"viewOrders",
	"editOrders",
	"viewSales",
	"viewEstimates",
	"editEstimates",
] as const;

const salesRepDashboardProcedure = protectedProcedure
	.input(salesRepDashboardPeriodSchema)
	.use(async ({ ctx, next }) => {
		await requireAnyOperationalPermission(
			ctx,
			SALES_REP_DASHBOARD_PERMISSIONS,
			"You do not have permission to view the sales rep dashboard.",
		);
		return next({ ctx });
	});

export const salesRepDashboardRouter = createTRPCRouter({
	overview: salesRepDashboardProcedure.query(({ ctx, input }) =>
		getSalesRepDashboardOverview(ctx, ctx.userId, input),
	),
	trend: salesRepDashboardProcedure.query(({ ctx, input }) =>
		getSalesRepDashboardTrend(ctx, ctx.userId, input),
	),
	activity: salesRepDashboardProcedure.query(({ ctx, input }) =>
		getSalesRepDashboardActivity(ctx, ctx.userId, input),
	),
});
