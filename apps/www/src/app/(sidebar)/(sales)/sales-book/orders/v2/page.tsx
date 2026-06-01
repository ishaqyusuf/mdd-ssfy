import PageShell from "@/components/page-shell";
import { ErrorFallbackSales } from "@/components/error-fallback-sales";
import { SalesOrdersV2Header } from "@/components/sales-orders-v2-header";
import { SalesOrdersV2SummaryWidgets } from "@/components/sales-orders-v2-summary-widgets";
import { DataTable } from "@/components/tables-2/sales-orders/data-table";
import { SalesOrdersSkeleton } from "@/components/tables-2/sales-orders/skeleton";
import { loadSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
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
    const queryClient = getQueryClient();
    const filter = loadSalesOrdersV2FilterParams(searchParams);
    const initialSettings = await getInitialTableSettings("sales-orders");

    await Promise.all([
        queryClient.fetchInfiniteQuery(
            trpc.sales.getOrdersV2.infiniteQueryOptions(filter, {
                getNextPageParam: ({ meta }) =>
                    (meta as { cursor?: string | number | null } | undefined)
                        ?.cursor,
            }) as any,
        ),
        queryClient.fetchQuery(
            trpc.sales.getOrdersV2Summary.queryOptions(filter),
        ),
    ]);

    return (
        <PageShell>
            <HydrateClient>
                <div className="flex flex-col gap-6">
                    <PageTitle>Sales V2</PageTitle>
                    <SalesOrdersV2SummaryWidgets />
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
            </HydrateClient>
        </PageShell>
    );
}
