import { authId } from "@/app-deps/(v1)/_actions/utils";
import PageShell from "@/components/page-shell";
import { ProductionWorkspace } from "@/components/production-workspace";
import { ScrollableContent } from "@/components/scrollable-content";
import { loadSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import type { Metadata } from "next";
import { unstable_noStore } from "next/cache";
import type { SearchParams } from "nuqs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Production Worker Dashboard",
	description:
		"Track due work, tomorrow alerts, and your active production queue",
};

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
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

	// redirect("/production/dashboard/v2"); // Temporary redirect to the new production page while we transition
	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<PageTitle>Production</PageTitle>
					<ProductionWorkspace
						mode="worker"
						initialTableSettings={initialTableSettings}
					/>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
