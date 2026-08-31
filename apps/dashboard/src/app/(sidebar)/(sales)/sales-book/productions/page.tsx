import {
	getOperationsCalendarPeriod,
	resolveOperationsCalendarDate,
} from "@/components/operations-calendar/range";
import PageShell from "@/components/page-shell";
import { SalesProductionTitle } from "@/components/sales-production/title";
import { SalesProductionWorkspace } from "@/components/sales-production/workspace";
import { ScrollableContent } from "@/components/scrollable-content";
import { loadSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
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
	const listInput = {
		...resolved.list,
		size: 20,
	} as RouterInputs["sales"]["productions"];
	const initialTableSettings =
		await getInitialTableSettings("sales-production");

	batchPrefetch([
		trpc.sales.productionSummary.queryOptions({
			q: filters.q,
			assignedToId: filters.assignedToId,
			"customer.name": filters["customer.name"],
			phone: filters.phone,
			po: filters.po,
			item: filters.item,
			"sales.rep": filters["sales.rep"],
			invoice: filters.invoice,
			salesNo: filters.salesNo,
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
		const calendarDate = resolveOperationsCalendarDate(
			filters.calendarDate || filters.date,
		);
		const period = getOperationsCalendarPeriod(
			calendarDate,
			filters.calendarView,
		);
		batchPrefetch([
			trpc.sales.productionCalendar.queryOptions({
				from: period.from,
				to: period.to,
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
