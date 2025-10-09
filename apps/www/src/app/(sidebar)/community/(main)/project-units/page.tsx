import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/project-units/data-table";
import { ProjectUnitHeader } from "@/components/project-units-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadProjectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Project Units | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
    const searchParams = await props.searchParams;
    const filter = loadProjectUnitFilterParams(searchParams);
    batchPrefetch([
        trpc.community.getProjectUnits.infiniteQueryOptions({
            ...(filter as any),
        }),
    ]);
    return (
        <div className="flex flex-col gap-6">
            <PageTitle>ProjectUnit</PageTitle>
            <ProjectUnitHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}

