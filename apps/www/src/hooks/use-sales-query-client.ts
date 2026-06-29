import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@gnd/ui/tanstack";

type SalesDocumentType = "order" | "quote" | "sales";

export function useSalesQueryClient() {
	const qc = useQueryClient();
	const trpc = useTRPC();
	const _invalidate = (queryKey: readonly unknown[]) =>
		qc.invalidateQueries({
			queryKey,
		});
	const invalidate = {
		salesList: () =>
			Promise.all([
				_invalidate(trpc.sales.getOrders.pathKey()),
				_invalidate(trpc.sales.getOrders.infiniteQueryKey()),
				_invalidate(trpc.sales.getOrdersV2.pathKey()),
				_invalidate(trpc.sales.getOrdersV2.infiniteQueryKey()),
				_invalidate(trpc.sales.getOrdersV2Summary.pathKey()),
			]),
		quoteList: () =>
			Promise.all([
				_invalidate(trpc.sales.quotes.pathKey()),
				_invalidate(trpc.sales.quotes.infiniteQueryKey()),
			]),
		productionOverview: () =>
			_invalidate(trpc.sales.productionOverview.queryKey()),
		saleOverview: () => _invalidate(trpc.sales.getSaleOverview.pathKey()),
		salesDocumentChanged: (_type?: SalesDocumentType | null) =>
			Promise.all([
				invalidate.salesList(),
				invalidate.quoteList(),
				invalidate.saleOverview(),
				_invalidate(trpc.filters.salesOrders.pathKey()),
				_invalidate(trpc.filters.salesOrdersV2.pathKey()),
				_invalidate(trpc.filters.salesQuotes.pathKey()),
				_invalidate(trpc.salesDashboard.getKpis.pathKey()),
				_invalidate(trpc.salesDashboard.getRecentSales.pathKey()),
				_invalidate(trpc.salesDashboard.getRevenueOverTime.pathKey()),
				_invalidate(trpc.salesDashboard.getTopProducts.pathKey()),
				_invalidate(trpc.salesDashboard.getSalesRepLeaderboard.pathKey()),
				_invalidate(trpc.sales.mobileDashboardOverview.pathKey()),
			]),
		salesPaymentChanged: () =>
			Promise.all([
				invalidate.salesDocumentChanged("order"),
				_invalidate(trpc.sales.getSaleTransactions.pathKey()),
				_invalidate(trpc.sales.getSalesAccountings.pathKey()),
				_invalidate(trpc.sales.accountingIndex.pathKey()),
			]),
	};
	const events = {
		assignmentUpdated: () => {
			invalidate.salesList();
			invalidate.productionOverview();
			invalidate.saleOverview();
		},
		assignmentSubmissionUpdated: () => {
			events.assignmentUpdated();
		},
		dispatchUpdated: () => {
			events.assignmentUpdated();
		},
		quoteCreated: () => {
			invalidate.salesDocumentChanged("quote");
		},
		salesCreated: () => {
			invalidate.salesDocumentChanged("order");
		},
		salesPaymentUpdated: () => {
			invalidate.salesPaymentChanged();
		},
		salesStatReset: () => {
			invalidate.salesDocumentChanged("order");
			events.assignmentUpdated();
		},
		productionUpdated: () => {
			invalidate.productionOverview();
			invalidate.salesList();
		},
	};
	return {
		...events,
		trpc,
		qc,
		events,
		invalidate,
	};
}
