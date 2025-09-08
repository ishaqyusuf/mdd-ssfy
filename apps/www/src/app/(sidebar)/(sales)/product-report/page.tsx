import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { DataTable } from "@/components/tables/sales-statistics/data-table";
import { SalesStatHeader } from "@/components/sales-stat-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadProductReportFilterParams } from "@/hooks/use-product-report-filter-params";
import { GridSkeleton } from "@/components/grid-skeleton";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Product Report | GND",
    });
}
export default async function Page(props) {
    const searchParams = await props.searchParams;
    const filter = loadProductReportFilterParams(searchParams);
    batchPrefetch([
        (trpc.sales.salesStatistics as any).infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <FPage can={["viewOrders"]} title="Sales Statistics">
            <SalesStatHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<GridSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </FPage>
    );
}

