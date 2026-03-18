import { Suspense } from "react";
import { SearchParams } from "nuqs";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/sales-dispatch/data-table";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { loadDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { batchPrefetch, trpc } from "@/trpc/server";
import { AdminDispatchHeader } from "@/components/dispatch-admin/admin-dispatch-header";
import {
    DispatchSummaryCards,
    DispatchSummaryCardsSkeleton,
} from "@/components/dispatch-admin/dispatch-summary-cards";
import {
    DriverWorkloadCard,
    DriverWorkloadSkeleton,
} from "@/components/dispatch-admin/driver-workload-card";

export async function generateMetadata() {
    return constructMetadata({
        title: "Admin Dispatch Dashboard | GND",
    });
}

type Props = {
    searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
    const searchParams = await props.searchParams;
    const filter = loadDispatchFilterParams(searchParams);

    batchPrefetch([
        trpc.dispatch.index.infiniteQueryOptions({
            ...(filter as any),
        }),
        trpc.dispatch.dispatchSummary.queryOptions(),
    ]);

    return (
        <FPage
            roles={["Super Admin"]}
            can={["editDelivery"]}
            title="Admin Dispatch Dashboard"
        >
            <div className="flex flex-col gap-6">
                {/* Summary KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                    <ErrorBoundary errorComponent={ErrorFallback}>
                        <Suspense fallback={<DispatchSummaryCardsSkeleton />}>
                            <DispatchSummaryCards />
                        </Suspense>
                    </ErrorBoundary>
                </div>

                {/* Header with Filters + Admin Actions */}
                <AdminDispatchHeader />

                {/* Main Content: Table + Sidebar */}
                <div className="flex gap-6 items-start">
                    {/* Dispatch Table */}
                    <div className="flex-1 min-w-0">
                        <ErrorBoundary errorComponent={ErrorFallback}>
                            <Suspense fallback={<TableSkeleton />}>
                                <DataTable />
                            </Suspense>
                        </ErrorBoundary>
                    </div>

                    {/* Driver Workload Sidebar */}
                    <div className="hidden xl:block w-64 shrink-0">
                        <ErrorBoundary errorComponent={ErrorFallback}>
                            <Suspense fallback={<DriverWorkloadSkeleton />}>
                                <DriverWorkloadCard />
                            </Suspense>
                        </ErrorBoundary>
                    </div>
                </div>
            </div>
        </FPage>
    );
}
