import {
	getSalesFinanceAdoptionReadiness,
	getSalesFinanceAnalytics,
	getSalesFinanceReceivableDetail,
	getSalesFinanceReceivables,
	getSalesFinanceReceivablesReport,
	getSalesFinanceReceivablesSummary,
	getSalesFinanceReport,
	getSalesFinanceResolutions,
	getSalesFinanceResolutionsSummary,
	getSalesFinanceSummary,
	getSalesFinanceTransactionDetail,
	getSalesFinanceTransactions,
	recordSalesFinanceAdoption,
	resolveSalesFinanceReconciliation,
	startSalesFinanceReconciliation,
	syncSalesFinanceResolutionBalance,
} from "@api/db/queries/sales-finance";
import { resolvePayment } from "@api/db/queries/wallet";
import {
	salesFinanceAdoptionPingSchema,
	salesFinanceAnalyticsSchema,
	salesFinancePaymentResolutionSchema,
	salesFinanceReceivableDetailSchema,
	salesFinanceReceivablesReportSchema,
	salesFinanceReceivablesSchema,
	salesFinanceReceivablesSummarySchema,
	salesFinanceReconciliationResolveSchema,
	salesFinanceReconciliationStartSchema,
	salesFinanceReportSchema,
	salesFinanceResolutionSyncSchema,
	salesFinanceResolutionsSchema,
	salesFinanceSummarySchema,
	salesFinanceTransactionDetailSchema,
	salesFinanceTransactionsSchema,
} from "@api/schemas/sales-finance";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { requireAnyOperationalPermission } from "@api/utils/operational-route-access";

const SALES_FINANCE_READ_PERMISSIONS = [
	"viewOrderPayment",
	"editOrderPayment",
	"viewSales",
	"editSales",
] as const;

async function requireSalesFinanceReadAccess(
	ctx: Parameters<typeof requireAnyOperationalPermission>[0],
) {
	return requireAnyOperationalPermission(
		ctx,
		SALES_FINANCE_READ_PERMISSIONS,
		"You do not have access to Sales Finance.",
	);
}

export const salesFinanceRouter = createTRPCRouter({
	adoptionPing: protectedProcedure
		.input(salesFinanceAdoptionPingSchema)
		.mutation(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			return recordSalesFinanceAdoption(ctx, input);
		}),
	adoptionReadiness: protectedProcedure.query(async ({ ctx }) => {
		await requireSalesFinanceReadAccess(ctx);
		return getSalesFinanceAdoptionReadiness(ctx);
	}),
	transactions: protectedProcedure
		.input(salesFinanceTransactionsSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			return getSalesFinanceTransactions(ctx, input);
		}),
	summary: protectedProcedure
		.input(salesFinanceSummarySchema)
		.query(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			return getSalesFinanceSummary(ctx, input);
		}),
	analytics: protectedProcedure
		.input(salesFinanceAnalyticsSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			return getSalesFinanceAnalytics(ctx, input);
		}),
	report: protectedProcedure
		.input(salesFinanceReportSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			await requireAnyOperationalPermission(
				ctx,
				["generateSalesPaymentReport"],
				"You do not have permission to generate Sales Finance reports.",
			);
			return getSalesFinanceReport(ctx, input);
		}),
	transactionDetail: protectedProcedure
		.input(salesFinanceTransactionDetailSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			return getSalesFinanceTransactionDetail(ctx, input.id);
		}),
	receivables: protectedProcedure
		.input(salesFinanceReceivablesSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			return getSalesFinanceReceivables(ctx, input);
		}),
	receivablesSummary: protectedProcedure
		.input(salesFinanceReceivablesSummarySchema)
		.query(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			return getSalesFinanceReceivablesSummary(ctx, input);
		}),
	receivablesReport: protectedProcedure
		.input(salesFinanceReceivablesReportSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			await requireAnyOperationalPermission(
				ctx,
				["generateSalesPaymentReport"],
				"You do not have permission to generate Sales Finance reports.",
			);
			return getSalesFinanceReceivablesReport(ctx, input);
		}),
	receivableDetail: protectedProcedure
		.input(salesFinanceReceivableDetailSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			return getSalesFinanceReceivableDetail(ctx, input.id);
		}),
	resolutions: protectedProcedure
		.input(salesFinanceResolutionsSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			return getSalesFinanceResolutions(ctx, input);
		}),
	resolutionsSummary: protectedProcedure
		.input(salesFinanceResolutionsSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			return getSalesFinanceResolutionsSummary(ctx, input);
		}),
	resolutionSyncBalance: protectedProcedure
		.input(salesFinanceResolutionSyncSchema)
		.mutation(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			await requireAnyOperationalPermission(
				ctx,
				["editOrderPayment"],
				"You do not have permission to resolve Sales Finance accounts.",
			);
			return syncSalesFinanceResolutionBalance(ctx, input);
		}),
	resolutionPayment: protectedProcedure
		.input(salesFinancePaymentResolutionSchema)
		.mutation(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			await requireAnyOperationalPermission(
				ctx,
				["editOrderPayment"],
				"You do not have permission to resolve Sales Finance payments.",
			);
			return resolvePayment(ctx, input);
		}),
	reconciliationStart: protectedProcedure
		.input(salesFinanceReconciliationStartSchema)
		.mutation(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			await requireAnyOperationalPermission(
				ctx,
				["editOrderPayment"],
				"You do not have permission to reconcile Sales Finance payments.",
			);
			return startSalesFinanceReconciliation(ctx, input);
		}),
	reconciliationResolve: protectedProcedure
		.input(salesFinanceReconciliationResolveSchema)
		.mutation(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			await requireAnyOperationalPermission(
				ctx,
				["editOrderPayment"],
				"You do not have permission to reconcile Sales Finance payments.",
			);
			return resolveSalesFinanceReconciliation(ctx, input);
		}),
});
