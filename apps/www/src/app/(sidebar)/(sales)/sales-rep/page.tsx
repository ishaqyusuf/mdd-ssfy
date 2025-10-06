import { Suspense } from "react";
import { Metadata } from "next";
import Link from "@/components/link";
import { authUser } from "@/app/(v1)/_actions/utils";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import CommissionPayments from "@/components/sales-rep-commission-payment";
import PendingCommissions from "@/components/sales-rep-pending-comissions";
import CustomerProfile from "@/components/sales-rep-profile";
import RecentQuotes from "@/components/sales-rep-recent-quotes";
import SalesChart from "@/components/sales-rep-sales-chart";
import {
    SalesRepActiveCustomers,
    SalesRepCommissionEarned,
    SalesRepPendingCommission,
    SalesRepTotalSales,
} from "@/components/sales-rep-summary-cards";
import { SummaryCardSkeleton } from "@/components/summary-card";
import { Plus } from "lucide-react";

import { Badge } from "@gnd/ui/badge";
import { buttonVariants } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { searchParamsCache } from "./search-params";
import { cn } from "@gnd/ui/cn";
import { DataTable } from "@/components/tables/sales-orders/data-table";
import { DataTable as RecentQuoteDataTable } from "@/components/tables/sales-quotes/data-table";

export const metadata: Metadata = {
    title: `My Dashboard | GND`,
};
export default async function SalesRepProfile(props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const searchParams = await props.searchParams;
    const {} = searchParamsCache.parse(searchParams);
    const user = await authUser();

    return (
        <FPage can={["editOrders"]} title="Sales Rep Profile">
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8 flex flex-col">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">
                            Welcome back,{" "}
                            {user?.name?.split(" ")?.filter(Boolean)?.[0]}
                        </h2>
                        <p className="text-muted-foreground">
                            Manage your sales activities and track performance
                        </p>
                    </div>

                    <Link
                        className={cn(
                            buttonVariants({ variant: "default" }),
                            "flex items-center gap-2",
                        )}
                        href="/sales-book/create-order"
                    >
                        <Plus className="h-4 w-4" />
                        Create Sale
                    </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Suspense fallback={<SummaryCardSkeleton />}>
                        <SalesRepTotalSales />
                    </Suspense>
                    <Suspense fallback={<SummaryCardSkeleton />}>
                        <SalesRepCommissionEarned />
                    </Suspense>
                    <Suspense fallback={<SummaryCardSkeleton />}>
                        <SalesRepPendingCommission />
                    </Suspense>
                    <Suspense fallback={<SummaryCardSkeleton />}>
                        <SalesRepActiveCustomers />
                    </Suspense>
                </div>

                <div className="hidden">
                    <Card className="">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Sales Performance</CardTitle>
                                <div className="flex items-center space-x-2">
                                    <Badge variant="outline">Monthly</Badge>
                                    <Badge variant="outline">Quarterly</Badge>
                                    <Badge variant="secondary">Yearly</Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <SalesChart />
                        </CardContent>
                    </Card>
                </div>
                <div className="flex flex-col">
                    <Tabs defaultValue="recent-sales" className="space-y-4">
                        <TabsList className="bg-muted">
                            <TabsTrigger value="recent-sales">
                                Recent Sales
                            </TabsTrigger>
                            <TabsTrigger value="recent-quotes">
                                Recent Quotes
                            </TabsTrigger>
                            {/* <TabsTrigger  value="customer-profile">
                        Customer Profile
                    </TabsTrigger> */}
                            <TabsTrigger value="commission">
                                Commission
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="recent-sales" className="space-y-4">
                            <DataTable
                                singlePage
                                defaultFilters={{
                                    size: 5,
                                }}
                            />
                            {/* <RecentSales /> */}
                        </TabsContent>
                        <TabsContent
                            value="recent-quotes"
                            className="space-y-4"
                        >
                            <RecentQuoteDataTable
                                singlePage
                                defaultFilters={{
                                    size: 5,
                                }}
                            />
                        </TabsContent>
                        <TabsContent
                            value="customer-profile"
                            className="space-y-4"
                        >
                            <CustomerProfile />
                        </TabsContent>
                        <TabsContent value="commission" className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <CommissionPayments />
                                <PendingCommissions />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </FPage>
    );
}

