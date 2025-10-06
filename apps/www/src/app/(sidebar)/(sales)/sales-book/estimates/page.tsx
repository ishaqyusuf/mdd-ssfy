import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { OrderHeader } from "@/components/sales-order-header";
import { DataTable } from "@/components/tables/sales-orders/data-table-copy";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadOrderFilterParams } from "@/hooks/use-sales-filter-params";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Sales | GND",
    });
}

export default async function Page(props) {
    const searchParams = await props.searchParams;
    const filter = loadOrderFilterParams(searchParams);
    batchPrefetch([
        trpc.sales.index.infiniteQueryOptions({
            ...(filter as any),
        }),
    ]);
    return (
        <FPage can={["viewOrders"]} title="Sales">
            <OrderHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </FPage>
    );
}

