import { InboundBackOrder } from "@/components/inbound-back-order";
import { InboundComplete } from "@/components/inbound-complete";
import { InboundMissingItems } from "@/components/inbound-missing-items";
import { InboundPending } from "@/components/inbound-pending";
import { InboundSummarySkeleton } from "@/components/inbound-summary";
import { InboundTotal } from "@/components/inbound-total";
import { batchPrefetch, trpc } from "@/trpc/server";
import { Metadata } from "next";
import { Suspense } from "react";
import { SearchParams } from "nuqs";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/inbound-managment/data-table";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";

export const metadata: Metadata = {
    title: "Inbound Managment | GND",
};
type Props = {
    searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
    batchPrefetch([
        trpc.sales.inboundSummary.queryOptions({
            status: "total",
        }),
        trpc.sales.inboundSummary.queryOptions({
            status: "back order",
        }),
        trpc.sales.inboundSummary.queryOptions({
            status: "complete",
        }),
        trpc.sales.inboundSummary.queryOptions({
            status: "missing items",
        }),
        trpc.sales.inboundSummary.queryOptions({
            status: "pending",
        }),
    ]);

    return (
        <FPage
            can={["editInboundOrder"]}
            title="Inbound Managment"
            // description="Manage inbound orders"
        >
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 pt-6">
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
                </div>
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense fallback={<TableSkeleton />}>
                        <DataTable />
                    </Suspense>
                </ErrorBoundary>
            </div>
        </FPage>
    );
}
