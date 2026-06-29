import { authUser } from "@/app-deps/(v1)/_actions/utils";
import Link from "@/components/link";
import PageShell from "@/components/page-shell";
import {
    SalesRepActiveCustomers,
    SalesRepCommissionEarned,
    SalesRepPendingCommission,
    SalesRepTotalSales,
} from "@/components/sales-rep-summary-cards";
import { SummaryCardSkeleton } from "@/components/summary-card";
import { SalesRepDealerRequests } from "@/components/sales-rep-dealer-requests";
import { SalesRepRequestCountBadge } from "@/components/sales-rep-request-badge";
import { SalesNav } from "@/components/sales-nav";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { Badge } from "@gnd/ui/badge";
import { Button, buttonVariants } from "@gnd/ui/button";
import { ButtonGroup } from "@gnd/ui/button-group";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import NextLink from "next/link";
import nextDynamic from "next/dynamic";
import { Suspense } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { Tabs, TabsContent } from "@gnd/ui/tabs";

import { searchParamsCache } from "./search-params";

export const dynamic = "force-dynamic";

const RecentSalesDataTable = nextDynamic(
    () =>
        import("@/components/tables/sales-orders/data-table").then(
            (mod) => mod.DataTable,
        ),
    {
        loading: () => <SummaryCardSkeleton />,
    },
);

const RecentQuoteDataTable = nextDynamic(
    () =>
        import("@/components/tables/sales-quotes/data-table").then(
            (mod) => mod.DataTable,
        ),
    {
        loading: () => <SummaryCardSkeleton />,
    },
);

const CommissionPayments = nextDynamic(
    () => import("@/components/sales-rep-commission-payment"),
    {
        loading: () => <SummaryCardSkeleton />,
    },
);

const PendingCommissions = nextDynamic(
    () => import("@/components/sales-rep-pending-comissions"),
    {
        loading: () => <SummaryCardSkeleton />,
    },
);

const CustomerProfile = nextDynamic(
    () => import("@/components/sales-rep-profile"),
    {
        loading: () => <SummaryCardSkeleton />,
    },
);

const salesRepTabs = [
    {
        value: "requests",
        label: "Requests",
        icon: Icons.Bell,
        badge: true,
    },
    {
        value: "recent-sales",
        label: "Recent Sales",
        icon: Icons.orders,
        badge: false,
    },
    {
        value: "recent-quotes",
        label: "Recent Quotes",
        icon: Icons.quotes,
        badge: false,
    },
    {
        value: "commission",
        label: "Commission",
        icon: Icons.dollar,
        badge: false,
    },
] as const;

type SalesRepTabValue = (typeof salesRepTabs)[number]["value"];

function getSalesRepTabHref(
    tab: SalesRepTabValue,
    params: { start?: string | null; end?: string | null },
) {
    const searchParams = new URLSearchParams({ tab });

    if (params.start) searchParams.set("start", params.start);
    if (params.end) searchParams.set("end", params.end);

    return `/sales-rep?${searchParams.toString()}`;
}

export async function generateMetadata() {
    return constructMetadata({
        title: "My Dashboard | GND",
    });
}
export default async function SalesRepProfile(props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const searchParams = await props.searchParams;
    const parsedSearchParams = searchParamsCache.parse(searchParams);
    const queryClient = getQueryClient();
    const defaultTab = parsedSearchParams.tab;
    const [_activeTabData, user] = await Promise.all([
        defaultTab === "recent-sales"
            ? queryClient.fetchInfiniteQuery(
                  trpc.sales.index.infiniteQueryOptions({
                      size: 5,
                  }) as any,
              )
            : defaultTab === "recent-quotes"
              ? queryClient.fetchInfiniteQuery(
                    trpc.sales.quotes.infiniteQueryOptions({
                        size: 5,
                    }) as any,
                )
              : defaultTab === "requests"
                ? queryClient.fetchQuery(
                      trpc.sales.dealerOrderRequests.queryOptions({
                          status: "all",
                          size: 25,
                      }),
                  )
                : Promise.resolve(),
        authUser(),
    ]);

    return (
        <PageShell className="p-3 sm:p-4 md:p-6">
            <HydrateClient>
                <PageTitle>Sales Rep Profile</PageTitle>
                <div className="flex flex-1 flex-col space-y-4 px-0 pt-2 sm:px-4 sm:pt-6 md:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                            <h2 className="text-xl font-semibold tracking-tight sm:text-3xl">
                                Welcome back,{" "}
                                {user?.name?.split(" ")?.filter(Boolean)?.[0]}
                            </h2>
                            <p className="text-sm text-muted-foreground sm:text-base">
                                Manage your sales activities and track
                                performance
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

                    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border/70 bg-background [&>*:nth-child(-n+2)]:border-t-0 sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:border-0 sm:bg-transparent lg:grid-cols-4">
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
                                        <Badge variant="outline">
                                            Quarterly
                                        </Badge>
                                        <Badge variant="secondary">
                                            Yearly
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="h-[240px] rounded-lg bg-muted/40" />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="flex flex-col">
                        <Tabs value={defaultTab} className="space-y-4">
                            <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
                                <ButtonGroup className="shrink-0">
                                    {salesRepTabs.map((tab) => {
                                        const Icon = tab.icon;
                                        const isActive = defaultTab === tab.value;

                                        return (
                                            <Button
                                                asChild
                                                className={cn(
                                                    "uppercase",
                                                    isActive
                                                        ? "bg-foreground text-background hover:bg-foreground/90"
                                                        : "text-muted-foreground",
                                                )}
                                                key={tab.value}
                                                variant={isActive ? "default" : "outline"}
                                            >
                                                <NextLink
                                                    aria-current={
                                                        isActive ? "page" : undefined
                                                    }
                                                    href={getSalesRepTabHref(tab.value, {
                                                        end: parsedSearchParams.end,
                                                        start: parsedSearchParams.start,
                                                    })}
                                                >
                                                    <Icon
                                                        aria-hidden="true"
                                                        className="size-4"
                                                    />
                                                    <span>{tab.label}</span>
                                                    {tab.badge ? (
                                                        <SalesRepRequestCountBadge />
                                                    ) : null}
                                                </NextLink>
                                            </Button>
                                        );
                                    })}
                                </ButtonGroup>
                            </div>
                            <TabsContent value="requests" className="space-y-4">
                                <SalesRepDealerRequests />
                            </TabsContent>
                            <TabsContent
                                value="recent-sales"
                                className="space-y-4"
                            >
                                <RecentSalesDataTable
                                    singlePage
                                    hideFloatingPagination
                                    defaultFilters={{
                                        size: 5,
                                    }}
                                />
                            </TabsContent>
                            <TabsContent
                                value="recent-quotes"
                                className="space-y-4"
                            >
                                <RecentQuoteDataTable
                                    singlePage
                                    hideFloatingPagination
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
                            <TabsContent
                                value="commission"
                                className="space-y-4"
                            >
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <CommissionPayments />
                                    <PendingCommissions />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
                <SalesNav />
            </HydrateClient>
        </PageShell>
    );
}
