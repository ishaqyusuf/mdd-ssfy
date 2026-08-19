import PageShell from "@/components/page-shell";
import { SalesProductionTitle } from "@/components/sales-production/title";
import { SalesProductionWorkspace } from "@/components/sales-production/workspace";
import { ScrollableContent } from "@/components/scrollable-content";
import { loadSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import dayjs from "@gnd/utils/dayjs";
import { resolveSalesProductionWorkspaceQuery } from "@sales/production-workspace-query";
import type { SearchParams } from "nuqs";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Production - gndprodesk.com",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function SalesProductionsPage({ searchParams }: Props) {
	const rawSearchParams = await searchParams;
	const filters = await loadSalesProductionFilterParams(rawSearchParams);
	const resolved = resolveSalesProductionWorkspaceQuery(filters);
	const listInput = resolved.list as RouterInputs["sales"]["productions"];
	const initialTableSettings =
		await getInitialTableSettings("sales-production");

	batchPrefetch([
		trpc.sales.productionSummary.queryOptions({
			q: filters.q,
			assignedToId: filters.assignedToId,
			priority: filters.priority,
		}),
		trpc.filters.salesProductions.queryOptions(),
	]);

	if (
		resolved.view === "table" &&
		(resolved.tab === "queue" || resolved.tab === "completed")
	) {
		batchPrefetch([
			trpc.sales.productions.infiniteQueryOptions(listInput, {
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			}),
		]);
	}

	if (resolved.view === "calendar") {
		const weekStart = dayjs(filters.date || undefined).startOf("day");
		batchPrefetch([
			trpc.sales.productionCalendar.queryOptions({
				from: weekStart.format("YYYY-MM-DD"),
				to: weekStart.add(6, "day").format("YYYY-MM-DD"),
				q: filters.q,
				assignedToId: filters.assignedToId,
				priority: filters.priority,
			}),
		]);
	}

	return (
		<PageShell className="pt-4">
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<SalesProductionTitle />
						<SalesProductionWorkspace
							initialTableSettings={initialTableSettings}
							defaultTableFilters={listInput}
						/>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
