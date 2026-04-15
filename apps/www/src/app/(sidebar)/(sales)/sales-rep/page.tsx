import { Icons } from "@gnd/ui/icons";
import { authUser } from "@/app-deps/(v1)/_actions/utils";
import Link from "@/components/link";
import PageShell from "@/components/page-shell";
import CommissionPayments from "@/components/sales-rep-commission-payment";
import PendingCommissions from "@/components/sales-rep-pending-comissions";
import CustomerProfile from "@/components/sales-rep-profile";
import SalesChart from "@/components/sales-rep-sales-chart";
import {
	SalesRepActiveCustomers,
	SalesRepCommissionEarned,
	SalesRepPendingCommission,
	SalesRepTotalSales,
} from "@/components/sales-rep-summary-cards";
import { SummaryCardSkeleton } from "@/components/summary-card";
import { DataTable } from "@/components/tables/sales-orders/data-table";
import { DataTable as RecentQuoteDataTable } from "@/components/tables/sales-quotes/data-table";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { Badge } from "@gnd/ui/badge";
import { cn } from "@gnd/ui/cn";
import { Suspense } from "react";

import { buttonVariants } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { searchParamsCache } from "./search-params";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "My Dashboard | GND",
	});
}
export default async function SalesRepProfile(props: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const searchParams = await props.searchParams;
	searchParamsCache.parse(searchParams);
	const queryClient = getQueryClient();
	await Promise.all([
		queryClient.fetchInfiniteQuery(
			trpc.sales.getOrders.infiniteQueryOptions({
				size: 5,
			}) as any,
		),
		queryClient.fetchInfiniteQuery(
			trpc.sales.quotes.infiniteQueryOptions({
				size: 5,
			}) as any,
		),
	]);
	const user = await authUser();

	return (
		<PageShell>
			<HydrateClient>
			<PageTitle>Sales Rep Profile</PageTitle>
			<div className="flex flex-1 flex-col space-y-4 p-4 pt-6 md:p-8">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 space-y-1">
						<h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
							Welcome back, {user?.name?.split(" ")?.filter(Boolean)?.[0]}
						</h2>
						<p className="text-muted-foreground">
							Manage your sales activities and track performance
						</p>
					</div>

					<Link
						className={cn(
							buttonVariants({ variant: "default" }),
							"inline-flex w-full items-center justify-center gap-2 sm:w-auto",
						)}
						href="/sales-book/create-order"
					>
						<Icons.Plus className="h-4 w-4" />
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
						<div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
							<TabsList className="inline-flex min-w-max bg-muted">
								<TabsTrigger value="recent-sales">Recent Sales</TabsTrigger>
								<TabsTrigger value="recent-quotes">Recent Quotes</TabsTrigger>
								{/* <TabsTrigger  value="customer-profile">
                        Customer Profile
                    </TabsTrigger> */}
								<TabsTrigger value="commission">Commission</TabsTrigger>
							</TabsList>
						</div>
						<TabsContent value="recent-sales" className="space-y-4">
							<DataTable
								singlePage
								hideFloatingPagination
								defaultFilters={{
									size: 5,
								}}
							/>
							{/* <RecentSales /> */}
						</TabsContent>
						<TabsContent value="recent-quotes" className="space-y-4">
							<RecentQuoteDataTable
								singlePage
								hideFloatingPagination
								defaultFilters={{
									size: 5,
								}}
							/>
						</TabsContent>
						<TabsContent value="customer-profile" className="space-y-4">
							<CustomerProfile />
						</TabsContent>
						<TabsContent value="commission" className="space-y-4">
							<div className="grid gap-4 lg:grid-cols-2">
								<CommissionPayments />
								<PendingCommissions />
							</div>
						</TabsContent>
					</Tabs>
				</div>
			</div>
			</HydrateClient>
		</PageShell>
	);
}
