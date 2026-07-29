import {
	getSalesFinanceSummary,
	getSalesFinanceTransactionDetail,
	getSalesFinanceTransactions,
} from "@api/db/queries/sales-finance";
import {
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
	transactionDetail: protectedProcedure
		.input(salesFinanceTransactionDetailSchema)
		.query(async ({ ctx, input }) => {
			await requireSalesFinanceReadAccess(ctx);
			return getSalesFinanceTransactionDetail(ctx, input.id);
		}),
});
