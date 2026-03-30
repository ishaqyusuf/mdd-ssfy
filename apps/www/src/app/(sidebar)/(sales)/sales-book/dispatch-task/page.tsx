import { DispatchHeader } from "@/components/dispatch-header";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/sales-dispatch/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
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
		<PageShell>
			<PageTitle>Dispatch Managment</PageTitle>
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
		</PageShell>
	);
}
