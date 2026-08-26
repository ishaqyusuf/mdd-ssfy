import {
	salesDashboardFilterSchema,
	salesPerformanceReportSchema,
	salesTaxReportSchema,
} from "@api/schemas/sales-dashboard";
import { requireAnyOperationalPermission } from "@api/utils/operational-route-access";
import {
	getKpis,
	getRecentSales,
	getRevenueOverTime,
	getSalesChannelBreakdown,
	getSalesPerformanceReport,
	getSalesRepLeaderboard,
	getSalesTaxReport,
	getTopProducts,
} from "../../db/queries/sales-dashboard";
import { createTRPCRouter, protectedProcedure } from "../init";

const SALES_REPORTING_READ_PERMISSIONS = [
	"viewOrders",
	"editOrders",
	"viewSales",
	"viewEstimates",
	"editEstimates",
] as const;

async function requireSalesReportingAccess(
	ctx: Parameters<typeof requireAnyOperationalPermission>[0],
) {
	return requireAnyOperationalPermission(
		ctx,
		SALES_REPORTING_READ_PERMISSIONS,
		"You do not have permission to view sales reporting.",
	);
}

async function requireSalesPerformanceExportAccess(
	ctx: Parameters<typeof requireAnyOperationalPermission>[0],
) {
	await requireSalesReportingAccess(ctx);
	return requireAnyOperationalPermission(
		ctx,
		["generateSalesPerformanceReport"],
		"You do not have permission to generate sales performance reports.",
	);
}

export const salesDashboardRouter = createTRPCRouter({
	getKpis: protectedProcedure
		.input(salesDashboardFilterSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesReportingAccess(ctx);
			return getKpis(ctx, input);
		}),

	getRevenueOverTime: protectedProcedure
		.input(salesDashboardFilterSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesReportingAccess(ctx);
			return getRevenueOverTime(ctx, input);
		}),

	getRecentSales: protectedProcedure
		.input(salesDashboardFilterSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesReportingAccess(ctx);
			return getRecentSales(ctx, input);
		}),

	getTopProducts: protectedProcedure
		.input(salesDashboardFilterSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesReportingAccess(ctx);
			return getTopProducts(ctx, input);
		}),

	getSalesRepLeaderboard: protectedProcedure
		.input(salesDashboardFilterSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesReportingAccess(ctx);
			return getSalesRepLeaderboard(ctx, input);
		}),

	getSalesChannelBreakdown: protectedProcedure
		.input(salesDashboardFilterSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesReportingAccess(ctx);
			return getSalesChannelBreakdown(ctx, input);
		}),

	report: protectedProcedure
		.input(salesPerformanceReportSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesPerformanceExportAccess(ctx);
			return getSalesPerformanceReport(ctx, input);
		}),

	salesTaxReport: protectedProcedure
		.input(salesTaxReportSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesPerformanceExportAccess(ctx);
			return getSalesTaxReport(ctx, input);
		}),
});
