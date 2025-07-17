import { Suspense } from "react";
import { SearchParams } from "nuqs";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/sales-dispatch/data-table";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { DispatchHeader } from "@/components/dispatch-header";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Dispatch Management | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
    // batchPrefetch([
    //     trpc.sales.inboundSummary.queryOptions({
    //         status: "total",
    //     }),
    //     trpc.sales.inboundSummary.queryOptions({
    //         status: "back order",
    //     }),
    //     trpc.sales.inboundSummary.queryOptions({
    //         status: "complete",
    //     }),
    //     trpc.sales.inboundSummary.queryOptions({
    //         status: "missing items",
    //     }),
    //     trpc.sales.inboundSummary.queryOptions({
    //         status: "pending",
    //     }),
    // ]);

    return (
        <FPage
            can={["editDelivery"]}
            title="Dispatch Managment"
            // description="Manage inbound orders"
        >
            <div className="flex flex-col gap-6">
                <DispatchHeader />
                {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 pt-6">
                    <Suspense fallback={<InboundSummarySkeleton />}>
                        <InboundTotal />
                    </Suspense>
                    <Suspense fallback={<InboundSummarySkeleton />}>
                        <InboundPending />
                    </Suspense>
                    <Suspense fallback={<InboundSummarySkeleton />}>
                        <InboundBackOrder />
                    </Suspense>
                    <Suspense fallback={<InboundSummarySkeleton />}>
                        <InboundMissingItems />
                    </Suspense>
                    <Suspense fallback={<InboundSummarySkeleton />}>
                        <InboundComplete />
                    </Suspense>
                </div> */}
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense fallback={<TableSkeleton />}>
                        <DataTable driver />
                    </Suspense>
                </ErrorBoundary>
            </div>
        </FPage>
    );
}

