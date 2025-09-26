import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { CommunityHeader } from "@/components/community-header";
import { ErrorFallback } from "@/components/error-fallback";

import { TableSkeleton } from "@/components/tables/skeleton";
import { loadInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";
import { CommunitySummary } from "@api/db/queries/community";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { SearchParams } from "nuqs";
import { Suspense } from "react";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Community Dashboard | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
    const searchParams = await props.searchParams;
    const filter = loadInventoryFilterParams(searchParams);
    batchPrefetch([
        trpc.inventories.inventoryProducts.infiniteQueryOptions({
            ...filter,
        }),
        ...(["projects", "units"] as CommunitySummary["type"][]).map((type) =>
            trpc.community.communitySummary.queryOptions({
                type,
            }),
        ),
    ]);
    return (
        <FPage title="Community">
            {/* <InventoryTabSwitch path="/inventory" /> */}
            <HydrateClient>
                <div className="flex flex-col gap-6">
                    <CommunityHeader />
                    <ErrorBoundary errorComponent={ErrorFallback}>
                        <Suspense fallback={<TableSkeleton />}>
                            {/* <DataTable /> */}
                        </Suspense>
                    </ErrorBoundary>
                </div>
            </HydrateClient>
        </FPage>
    );
}

