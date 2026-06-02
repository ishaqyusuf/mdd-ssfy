import PageShell from "@/components/page-shell";
import { CollapsibleSummary } from "@/components/collapsible-summary";
import { ErrorFallbackSales } from "@/components/error-fallback-sales";
import { SalesOrdersV2Header } from "@/components/sales-orders-v2-header";
import { SalesOrdersV2Evaluating } from "@/components/sales-orders-v2-evaluating";
import { SalesOrdersV2InvoiceValue } from "@/components/sales-orders-v2-invoice-value";
import { SalesOrdersV2Outstanding } from "@/components/sales-orders-v2-outstanding";
import { SalesOrdersV2Paid } from "@/components/sales-orders-v2-paid";
import { SalesOrdersV2SummarySkeleton } from "@/components/sales-orders-v2-summary";
import { SalesOrdersV2TotalOrders } from "@/components/sales-orders-v2-total-orders";
import { ScrollableContent } from "@/components/scrollable-content";
import { DataTable } from "@/components/tables-2/sales-orders/data-table";
import { SalesOrdersSkeleton } from "@/components/tables-2/sales-orders/skeleton";
import { loadSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return constructMetadata({
        title: "Sales V2 | GND",
    });
}

type Props = {
    searchParams: Promise<SearchParams>;
};

export default async function SalesOrdersV2Page(props: Props) {
    const searchParams = await props.searchParams;
    const filter = loadSalesOrdersV2FilterParams(searchParams);
    const { sort } = loadSortParams(searchParams);
    const initialSettings = await getInitialTableSettings("sales-orders");

    batchPrefetch([
        trpc.sales.getOrdersV2.infiniteQueryOptions(
            {
                ...filter,
                sort,
            },
            {
                getNextPageParam: ({ meta }) =>
                    (meta as { cursor?: string | number | null } | undefined)
                        ?.cursor,
            },
        ),
        trpc.sales.getOrdersV2Summary.queryOptions(filter),
    ]);

    return (
        <PageShell>
            <HydrateClient>
                <ScrollableContent>
                    <div className="flex flex-col gap-6">
                        <PageTitle>Sales V2</PageTitle>
                        <CollapsibleSummary>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                <Suspense
                                    fallback={<SalesOrdersV2SummarySkeleton />}
                                >
                                    <SalesOrdersV2TotalOrders />
                                </Suspense>
                                <Suspense
                                    fallback={<SalesOrdersV2SummarySkeleton />}
                                >
                                    <SalesOrdersV2InvoiceValue />
                                </Suspense>
                                <Suspense
                                    fallback={<SalesOrdersV2SummarySkeleton />}
                                >
                                    <SalesOrdersV2Outstanding />
                                </Suspense>
                                <Suspense
                                    fallback={<SalesOrdersV2SummarySkeleton />}
                                >
                                    <SalesOrdersV2Paid />
                                </Suspense>
                                <Suspense
                                    fallback={<SalesOrdersV2SummarySkeleton />}
                                >
                                    <SalesOrdersV2Evaluating />
                                </Suspense>
                            </div>
                        </CollapsibleSummary>
                        <SalesOrdersV2Header />
                        <ErrorBoundary errorComponent={ErrorFallbackSales}>
                            <Suspense
                                fallback={
                                    <SalesOrdersSkeleton
                                        initialSettings={initialSettings}
                                    />
                                }
                            >
                                <DataTable initialSettings={initialSettings} />
                            </Suspense>
                        </ErrorBoundary>
                    </div>
                </ScrollableContent>
            </HydrateClient>
        </PageShell>
    );
}
