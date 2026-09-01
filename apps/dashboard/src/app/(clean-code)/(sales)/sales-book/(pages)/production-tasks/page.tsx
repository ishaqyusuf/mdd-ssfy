import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import {
	ProductionWorkspace,
	ProductionWorkspaceSkeleton,
} from "@/components/production-workspace";
import { ScrollableContent } from "@/components/scrollable-content";
import { loadSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { resolveSalesProductionWorkspaceQuery } from "@sales/production-workspace-query";
import { unstable_noStore } from "next/cache";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Production - gndprodesk.com",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};
type SalesProductionInput = RouterInputs["sales"]["productions"];

export default async function SalesBookPage(props: Props) {
	unstable_noStore();
	const searchParams = await props.searchParams;
	const filter = loadSalesProductionFilterParams(searchParams);
	const queryInput = {
		...resolveSalesProductionWorkspaceQuery(filter).list,
		size: 20,
	} as SalesProductionInput;
	const initialTableSettings =
		await getInitialTableSettings("sales-production");

	batchPrefetch([
		trpc.sales.productionDashboardTasks.queryOptions({
			priority: filter.priority || undefined,
		}),
		trpc.filters.salesProductions.queryOptions(),
		trpc.sales.productionTasks.infiniteQueryOptions(queryInput, {
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
						<Suspense
							fallback={
								<ProductionWorkspaceSkeleton
									mode="worker"
									initialTableSettings={initialTableSettings}
								/>
							}
						>
							<ProductionWorkspace
								mode="worker"
								initialTableSettings={initialTableSettings}
							/>
						</Suspense>
					</ErrorBoundary>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
