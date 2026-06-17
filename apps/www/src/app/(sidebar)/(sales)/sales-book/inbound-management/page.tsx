import { ErrorFallback } from "@/components/error-fallback";
import { InboundBackOrder } from "@/components/inbound-back-order";
import { InboundComplete } from "@/components/inbound-complete";
import { InboundHeader } from "@/components/inbound-header";
import { InboundMissingItems } from "@/components/inbound-missing-items";
import { InboundPending } from "@/components/inbound-pending";
import { InboundSummarySkeleton } from "@/components/inbound-summary";
import { InboundTotal } from "@/components/inbound-total";
import { DataTable } from "@/components/tables-2/inbound-management/data-table";
import { InboundManagementSkeleton } from "@/components/tables-2/inbound-management/skeleton";
import { loadInboundFilterParams } from "@/hooks/use-inbound-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";
type InboundInput = RouterInputs["sales"]["inboundIndex"];

export async function generateMetadata() {
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
	const initialSettings = await getInitialTableSettings("inbound-management");
	const queryInput = filter as InboundInput;

	batchPrefetch([
		trpc.sales.inboundIndex.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
		...(
			["total", "back order", "complete", "missing items", "pending"] as const
		).map((status) =>
			trpc.sales.inboundSummary.queryOptions({
				status,
			}),
		),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>Inbound Managment</PageTitle>
				<div className="flex flex-col gap-6">
					<InboundHeader />
					<div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-5">
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
						<Suspense
							fallback={
								<InboundManagementSkeleton initialSettings={initialSettings} />
							}
						>
							<DataTable initialSettings={initialSettings} />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
