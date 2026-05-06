import { ChartSelectors } from "@/components/charts/chart-selectors";
import PageShell from "@/components/page-shell";
import { SalesKpiWidgets } from "@/components/widgets/sales-kpi-widget";
import { resolveSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import {
	HydrateClient,
	batchPrefetch,
	getQueryClient,
	trpc,
} from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { DashboardDeferredSections } from "./dashboard-deferred-sections";

export const dynamic = "force-dynamic";

export default async function SalesDashboardPage(props) {
	const searchParams = await props.searchParams;
	const dashboardParams = resolveSalesDashboardParams(searchParams);
	const queryClient = getQueryClient();

	const kpiPromise = queryClient.fetchQuery(
		trpc.salesDashboard.getKpis.queryOptions({
			from: dashboardParams.from,
			to: dashboardParams.to,
		}),
	);

	batchPrefetch([
		trpc.salesDashboard.getRevenueOverTime.queryOptions({
			from: dashboardParams.from,
			to: dashboardParams.to,
		}),
		trpc.salesDashboard.getRecentSales.queryOptions(),
		trpc.salesDashboard.getTopProducts.queryOptions({
			from: dashboardParams.from,
			to: dashboardParams.to,
		}),
		trpc.salesDashboard.getSalesRepLeaderboard.queryOptions({
			from: dashboardParams.from,
			to: dashboardParams.to,
		}),
	]);

	const kpis = await kpiPromise;

	return (
		<PageShell className="p-3 sm:p-4 md:p-6">
			<HydrateClient>
				<div className="space-y-4 sm:space-y-6">
					<PageTitle>Dashboard</PageTitle>
					<SalesKpiWidgets initialData={kpis} initialParams={dashboardParams} />
					<div>
						<ChartSelectors />
					</div>

					<DashboardDeferredSections />
				</div>
			</HydrateClient>
		</PageShell>
	);
}
