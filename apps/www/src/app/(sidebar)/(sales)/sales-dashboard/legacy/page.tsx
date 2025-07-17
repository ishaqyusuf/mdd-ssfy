import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import Portal from "@/components/_v1/portal";
import { DataPageShell } from "@/components/_v1/shells/data-page-shell";
import { StartCard, StatCardContainer } from "@/components/_v1/stat-card";
import { Metadata } from "next";
import BarChart from "./bar-chart";
import NewFeatureBtn from "@/components/common/new-feature-btn";
import { salesDashboardAction } from "./sales-dashboard";
import RecentSalesDashboardCard from "./recent-sales-dashboard-card";

export const metadata: Metadata = {
    title: "Sales Dashboard",
};

interface Props {}
export default async function SalesDashboardPage({}: Props) {
    const salesDashboard = await salesDashboardAction();
    const {
        totalSales,
        amountDue,
        totalDoors,
        completedOrders,
        completedDoors,
        totalOrders,
    } = salesDashboard;
    return (
        <AuthGuard can={["editDashboard"]}>
            <Portal nodeId={"actionNav"}>
                <NewFeatureBtn href="/sales/orders">New Site</NewFeatureBtn>
            </Portal>
            <DataPageShell className="space-y-4" data={salesDashboard}>
                <Breadcrumbs>
                    <BreadLink isFirst title="Dashboard" />
                    <BreadLink isLast title="Sales" />
                </Breadcrumbs>
                <Portal nodeId="dashboardTitle">Sales Dashboard</Portal>

                <StatCardContainer>
                    <StartCard
                        masked
                        icon="dollar"
                        value={totalSales}
                        label="Total Sales"
                        money
                    />
                    <StartCard
                        masked
                        icon="dollar"
                        value={amountDue}
                        label="Amount Due"
                        money
                    />
                    <StartCard
                        label="Total Orders"
                        icon="lineChart"
                        value={totalOrders}
                        info={`${completedOrders || 0} completed`}
                    />
                    <StartCard
                        icon="lineChart"
                        label="Doors Ordered"
                        value={totalDoors}
                        info={`${completedDoors || 0} completed`}
                    />
                </StatCardContainer>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <BarChart chartData={salesDashboard.bar} />
                    {/* <Card className="lg:col-span-4">
                        <CardHeader>
                            <CardTitle>Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <BarChartComponent
                                data={salesDashboard.bar || []}
                            />
                        </CardContent>
                    </Card> */}
                    <RecentSalesDashboardCard className="md:col-span-1 lg:col-span-3" />
                </div>
            </DataPageShell>
        </AuthGuard>
    );
}
