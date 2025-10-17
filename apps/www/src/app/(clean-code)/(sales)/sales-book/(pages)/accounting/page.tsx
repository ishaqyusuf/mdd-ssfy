import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/sales-accounting/data-table";
import { SalesAccountingHeader } from "@/components/sales-accounting-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadSalesAccountingFilterParams } from "@/hooks/use-sales-accounting-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Sales Accounting | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
    const searchParams = await props.searchParams;
    const filter = loadSalesAccountingFilterParams(searchParams);
    batchPrefetch([
        trpc.sales.getSalesAccountings.infiniteQueryOptions({
            ...(filter as any),
        }),
    ]);
    return (
        <div className="flex flex-col gap-6 py-6">
            <PageTitle>Sales Accounting</PageTitle>
            <SalesAccountingHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
