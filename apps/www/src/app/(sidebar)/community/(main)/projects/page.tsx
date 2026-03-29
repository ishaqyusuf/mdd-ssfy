import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { CommunityProjectHeader } from "@/components/community-project-header";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/community-project/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadCommunityProjectFilterParams } from "@/hooks/use-community-project-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { SearchParams } from "nuqs";
import { Suspense } from "react";

export async function generateMetadata() {
    return constructMetadata({
        title: "Community Projects | GND",
    });
}

type Props = {
    searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
    const searchParams = await props.searchParams;
    const filter = loadCommunityProjectFilterParams(searchParams);

    batchPrefetch([
        trpc.community.getCommunityProjects.infiniteQueryOptions({
            ...filter,
        }),
    ]);

    return (
        <FPage title="Projects">
            <HydrateClient>
                <div className="flex flex-col gap-6">
                    <CommunityProjectHeader />
                    <ErrorBoundary errorComponent={ErrorFallback}>
                        <Suspense fallback={<TableSkeleton />}>
                            <DataTable />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            </HydrateClient>
        </FPage>
    );
}
