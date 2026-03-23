import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/contractor-jobs/data-table";
import { JobHeader } from "@/components/contractor-jobs-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadJobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { JobsKpiWidget } from "@/components/widgets/jobs-kpi-widget";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Job | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
    const searchParams = await props.searchParams;
    const filter = loadJobFilterParams(searchParams);
    batchPrefetch([
        trpc.jobs.getJobs.infiniteQueryOptions({
            ...filter,
        }),
        trpc.jobs.getKpis.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div className="flex flex-col gap-6 pt-6">
            <PageTitle>Job</PageTitle>
            <JobsKpiWidget />
            <JobHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}

