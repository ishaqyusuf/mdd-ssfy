import type { Metadata } from "next";
import { unstable_noStore } from "next/cache";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";

import { authId } from "@/app-deps/(v1)/_actions/utils";
import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ProductionWorkspace } from "@/components/production-workspace";
import { ScrollableContent } from "@/components/scrollable-content";
import { loadSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Production Dashboard",
	description:
		"Track due work, tomorrow alerts, and your active production queue",
};

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
	unstable_noStore();
	const searchParams = await props.searchParams;
	const filter = await loadSalesProductionFilterParams(searchParams);
	const tableFilter = withDefaultProductionQueue(filter);
	const workerId = await authId();
	const initialTableSettings =
		await getInitialTableSettings("sales-production");

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
		trpc.sales.productionTasks.infiniteQueryOptions(tableFilter, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Production</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<ProductionWorkspace
								mode="worker"
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
