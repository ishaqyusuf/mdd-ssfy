import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { PackingListSkeleton } from "@/components/tables-2/packing-list/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

import { PackingListClient } from "./packing-list-client";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function PackingListPage({ searchParams }: Props) {
	const params = await searchParams;
	const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
	const tab = rawTab === "completed" ? "completed" : "current";
	const initialSettings = await getInitialTableSettings("packing-list");

	batchPrefetch([
		trpc.dispatch.packingList.queryOptions({
			tab,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Packing List</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<PackingListSkeleton initialSettings={initialSettings} />
								}
							>
								<PackingListClient initialSettings={initialSettings} />
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
