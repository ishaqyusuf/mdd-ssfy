import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";

import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ProductionWorkspace } from "@/components/production-workspace";
import { ScrollableContent } from "@/components/scrollable-content";
import { loadSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Production - gndprodesk.com",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

type SalesProductionFilter = Awaited<
	ReturnType<typeof loadSalesProductionFilterParams>
>;

function withDefaultProductionQueue(filter: SalesProductionFilter) {
	const hasExplicitQueue =
		!!filter.show ||
		!!filter.production ||
		!!filter.productionDueDate ||
		!!filter.priority ||
		!!filter.q ||
		!!filter.salesNo ||
		!!filter.assignedToId;

	return hasExplicitQueue
		? filter
		: { ...filter, production: "pending" as const };
}

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = await loadSalesProductionFilterParams(searchParams);
	const tableFilter = withDefaultProductionQueue(filter);
	const initialTableSettings =
		await getInitialTableSettings("sales-production");

	batchPrefetch([
		trpc.sales.productionDashboard.queryOptions({
			priority: filter.priority || undefined,
		}),
		trpc.filters.salesProductions.queryOptions(),
		trpc.sales.productions.infiniteQueryOptions(tableFilter, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Sales Production</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<ProductionWorkspace
								mode="admin"
								initialTableSettings={initialTableSettings}
								defaultTableFilters={tableFilter}
							/>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
