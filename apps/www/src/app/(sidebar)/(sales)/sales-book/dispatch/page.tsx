import { Suspense } from "react";
import { SearchParams } from "nuqs";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/sales-dispatch/data-table";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { DispatchHeader } from "@/components/dispatch-header";
import { loadDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { batchPrefetch, trpc } from "@/trpc/server";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Dispatch Management | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
    const searchParams = await props.searchParams;
    const filter = loadDispatchFilterParams(searchParams);
    batchPrefetch([
        (trpc.dispatch.index as any).infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <FPage can={["editDelivery"]} title="Dispatch Managment">
            <div className="flex flex-col gap-6">
                <DispatchHeader />
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense fallback={<TableSkeleton />}>
                        <DataTable />
                    </Suspense>
                </ErrorBoundary>
            </div>
        </FPage>
    );
}

