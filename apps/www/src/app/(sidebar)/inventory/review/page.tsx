import { ErrorFallback } from "@/components/error-fallback";
import { LazyInventoryKindReviewPage } from "@/components/inventory/lazy-inventory-kind-review-page";
import PageShell from "@/components/page-shell";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return constructMetadata({
        title: "Inventory Kind Review | GND",
    });
}

export default async function Page() {
    const queryClient = getQueryClient();

    await queryClient.fetchInfiniteQuery(
        trpc.inventories.inventoryProductKindReview.infiniteQueryOptions(
            {
                size: 24,
            },
            {
                getNextPageParam: (lastPage) => lastPage.meta?.cursor,
            },
        ) as any,
    );

    return (
        <PageShell>
            <HydrateClient>
                <PageTitle>Inventory Kind Review</PageTitle>
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <LazyInventoryKindReviewPage />
                </ErrorBoundary>
            </HydrateClient>
        </PageShell>
    );
}
