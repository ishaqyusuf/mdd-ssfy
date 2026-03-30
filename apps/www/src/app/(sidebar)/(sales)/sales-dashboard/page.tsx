import { ChartSelectors } from "@/components/charts/chart-selectors";
import { Charts } from "@/components/charts/charts";
import { Widgets } from "@/components/widgets";
import { SalesKpiWidgets } from "@/components/widgets/sales-kpi-widget";
import { HydrateClient } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import PageShell from "@/components/page-shell";
export default async function SalesDashboardPage() {
	return (
		<PageShell>
			<HydrateClient>
				<div className="p-4 sm:py-8">
					<PageTitle>Dashboard</PageTitle>
					<SalesKpiWidgets />
					<div className="h-[400px] mb-4">
						<ChartSelectors />
						<div className="mt-8 relative">
							{/* <EmptyState /> */}
							<Charts />
						</div>
					</div>

					<Widgets />
				</div>
			</HydrateClient>
		</PageShell>
	);
}
