import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/community-template/data-table";
import { CommunityTemplateHeader } from "@/components/community-template-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadCommunityTemplateFilterParams } from "@/hooks/use-community-template-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Community Templates | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
    const searchParams = await props.searchParams;
    const filter = loadCommunityTemplateFilterParams(searchParams);
    batchPrefetch([
        trpc.community.getCommunityTemplates.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div className="flex flex-col gap-6">
            <PageTitle>Community Template</PageTitle>
            <CommunityTemplateHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}

