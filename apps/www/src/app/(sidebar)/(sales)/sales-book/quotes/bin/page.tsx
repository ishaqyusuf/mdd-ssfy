import { ErrorFallback } from "@/components/error-fallback";
import { SalesQuoteHeader } from "@/components/sales-quote-header";
import { DataTable } from "@/components/tables/sales-quotes/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { resolveSalesVisibility } from "@/lib/sales-visibility";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";
export async function generateMetadata(props) {
    return constructMetadata({
        title: "Quotes Bin | GND",
    });
}

export default async function Page(props) {
    const searchParams = await props.searchParams;
    const queryClient = getQueryClient();
    const { filter } = await resolveSalesVisibility(
        loadOrderFilterParams(searchParams),
    );
    await queryClient.fetchInfiniteQuery(
        trpc.sales.quotes.infiniteQueryOptions({
            ...(filter as any),
            bin: true,
        }) as any,
    );
    return (
        <PageShell>
            <HydrateClient>
                <PageTitle>Quotes Bin</PageTitle>
                <div className="flex flex-col gap-6">
                    <SalesQuoteHeader />
                    <ErrorBoundary errorComponent={ErrorFallback}>
                        <Suspense fallback={<TableSkeleton />}>
                            <DataTable bin />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            </HydrateClient>
        </PageShell>
    );
}
