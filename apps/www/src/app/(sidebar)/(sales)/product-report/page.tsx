import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { DataTable } from "@/components/tables/sales-statistics/data-table";
import { ProductReportHeader } from "@/components/product-report-header";
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
    console.log({ filter });

    batchPrefetch([
        (trpc.sales.getProductReport as any).infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <FPage can={["viewOrders"]} title="Sales Statistics">
            <ProductReportHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<GridSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </FPage>
    );
}

