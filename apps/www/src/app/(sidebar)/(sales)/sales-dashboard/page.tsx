import { ChartSelectors } from "@/components/charts/chart-selectors";
import { Charts } from "@/components/charts/charts";
import { Widgets } from "@/components/widgets";
import { KpiWidgets } from "@/components/widgets/kpi-widgets";
import { HydrateClient } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
export default async function SalesDashboardPage() {
    return (
        <HydrateClient>
            <div className="p-4 sm:py-8">
                <PageTitle>Dashboard</PageTitle>
                <KpiWidgets />
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
    );
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">
                    Sales Dashboard
                </h2>
            </div>

            {/* KPI Widgets */}
            <KpiWidgets />

            {/* Main Chart Area */}
            <div className="border rounded-md p-4 md:p-8">
                <ChartSelectors />
                <div className="mt-8 relative">
                    <Charts />
                </div>
            </div>

            {/* Bottom Widgets Grid */}
            <Widgets />
        </div>
    );
}

