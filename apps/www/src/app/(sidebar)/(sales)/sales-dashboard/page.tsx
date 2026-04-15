import { ChartSelectors } from "@/components/charts/chart-selectors";
import { SalesKpiWidgets } from "@/components/widgets/sales-kpi-widget";
import { HydrateClient, batchPrefetch, getQueryClient, trpc } from "@/trpc/server";
import { resolveSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { PageTitle } from "@gnd/ui/custom/page-title";
import PageShell from "@/components/page-shell";
import { DashboardDeferredSections } from "./dashboard-deferred-sections";

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
		<PageShell>
			<HydrateClient>
				<div className="p-4 sm:py-8">
					<PageTitle>Dashboard</PageTitle>
					<SalesKpiWidgets
                        initialData={kpis}
                        initialParams={dashboardParams}
                    />
					<div className="h-[400px] mb-4">
						<ChartSelectors />
					</div>

					<DashboardDeferredSections />
				</div>
			</HydrateClient>
		</PageShell>
	);
}
