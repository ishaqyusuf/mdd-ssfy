import { ErrorFallback } from "@/components/error-fallback";
import { InboundBackOrder } from "@/components/inbound-back-order";
import { InboundComplete } from "@/components/inbound-complete";
import { InboundHeader } from "@/components/inbound-header";
import { InboundMissingItems } from "@/components/inbound-missing-items";
import { InboundPending } from "@/components/inbound-pending";
import { InboundSummarySkeleton } from "@/components/inbound-summary";
import { InboundTotal } from "@/components/inbound-total";
import { DataTable } from "@/components/tables/inbound-managment/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadInboundFilterParams } from "@/hooks/use-inbound-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { batchPrefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

export async function generateMetadata(props) {
	return constructMetadata({
		title: "Inbound Management | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadInboundFilterParams(searchParams);

	batchPrefetch([
		trpc.sales.inboundIndex.infiniteQueryOptions({
			...(filter as any),
		}),
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
		<PageShell>
			<PageTitle>Inbound Managment</PageTitle>
			<div className="flex flex-col gap-6">
				<InboundHeader />
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
		</PageShell>
	);
}
