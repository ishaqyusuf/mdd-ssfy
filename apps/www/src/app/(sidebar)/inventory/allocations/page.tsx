import { ErrorFallback } from "@/components/error-fallback";
import { InventoryAllocationReviewPage } from "@/components/inventory/inventory-allocation-review-page";
import PageShell from "@/components/page-shell";
import { TableSkeleton } from "@/components/tables/skeleton";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
    const queryClient = getQueryClient();
    await props.searchParams;
    await queryClient.fetchInfiniteQuery(
        trpc.inventories.pendingAllocations.infiniteQueryOptions(
            {
                size: 20,
            },
            {
                getNextPageParam: (lastPage: any) => lastPage.meta?.cursor,
            },
        ) as any,
    );

    return (
        <PageShell>
            <PageTitle>Inventory Allocations</PageTitle>
            <HydrateClient>
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense fallback={<TableSkeleton />}>
                        <InventoryAllocationReviewPage />
                    </Suspense>
                </ErrorBoundary>
            </HydrateClient>
        </PageShell>
    );
}
