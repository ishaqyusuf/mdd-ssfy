import { ChartSelectors } from "@/components/charts/chart-selectors";
import { Charts } from "@/components/charts/charts";
import { KpiWidgets } from "@/components/widgets/kpi-widgets";
import { RecentSalesWidget } from "@/components/widgets/recent-sales-widget";
import { SalesRepLeaderboardWidget } from "@/components/widgets/sales-rep-leaderboard-widget";
import { TopProductsWidget } from "@/components/widgets/top-products-widget";

export default async function SalesDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Sales Dashboard</h2>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RecentSalesWidget />
        <TopProductsWidget />
        <SalesRepLeaderboardWidget />
      </div>
    </div>
  );
}