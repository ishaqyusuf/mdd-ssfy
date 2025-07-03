import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { searchParamsCache } from "./search-params";
import { ErrorFallback } from "@/components/error-fallback";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/tables/skeleton";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { SalesAccountingTable } from "@/components/tables/sales-accounting";

export default async function HomePage({ searchParams }) {
    const searchQuery = searchParamsCache.parse(await searchParams);
    const { search } = searchQuery;

    const loadingKey = JSON.stringify({
        search,
    });
    return (
        <ErrorBoundary errorComponent={ErrorFallback}>
            <FPage can={["viewOrders"]} title="Sales Accounting">
                <Suspense fallback={<TableSkeleton />} key={loadingKey}>
                    <SalesAccountingTable query={searchQuery} />
                </Suspense>
            </FPage>
        </ErrorBoundary>
    );
}
