import { authId } from "@/app-deps/(v1)/_actions/utils";
import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ProductionWorkspace } from "@/components/production-workspace";
import { ScrollableContent } from "@/components/scrollable-content";
import { loadSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { unstable_noStore } from "next/cache";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Production - gndprodesk.com",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function SalesBookPage(props: Props) {
	unstable_noStore();
	const searchParams = await props.searchParams;
	const filter = loadSalesProductionFilterParams(searchParams);
	const workerId = await authId();
	const initialTableSettings = await getInitialTableSettings("sales-production");

	batchPrefetch([
		trpc.sales.productionDashboard.queryOptions(
			workerId
				? {
						workerId: Number(workerId),
						priority: filter.priority || undefined,
					}
				: {
						priority: filter.priority || undefined,
					},
		),
		trpc.filters.salesProductions.queryOptions(),
		trpc.sales.productionTasks.infiniteQueryOptions(filter, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<PageTitle>Sales Production</PageTitle>
					<ErrorBoundary errorComponent={ErrorFallback}>
						<ProductionWorkspace
							mode="worker"
							initialTableSettings={initialTableSettings}
						/>
					</ErrorBoundary>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
