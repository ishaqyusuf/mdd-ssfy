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
import { getServerAuthSession } from "@/lib/auth/session";
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
	const enteredAt = Date.now();
	const startedAt = performance.now();
	const rawSearchParams = await searchParams;
	// Temporary opt-in probe for the live first-request timeout. Never include
	// query inputs, session data, results, or exception text in these events.
	const timingEnabled = rawSearchParams.__productionTiming === "1";
	const mark = (phase:
		| "params_resolved" | "filters_resolved" | "settings_resolved"
		| "auth_observer_started" | "auth_observer_settled" | "auth_observer_rejected"
		| "prefetch_started" | "summary_settled" | "summary_rejected"
		| "filters_settled" | "filters_rejected" | "list_settled" | "list_rejected"
		| "calendar_settled" | "calendar_rejected" | "shell_returned") => {
		if (!timingEnabled) return;
		try {
			console.info("[DEBUG-production-route-v1]", JSON.stringify({
				phase, enteredAt, elapsedMs: Math.round(performance.now() - startedAt),
			}));
		} catch { /* Diagnostic output must not fail the page. */ }
	};
	mark("params_resolved");
	if (timingEnabled) {
		// Observe the existing request-cached session without awaiting it here.
		// This measures remaining wait, not total auth time if layout began first.
		mark("auth_observer_started");
		void getServerAuthSession().then(
			() => mark("auth_observer_settled"),
			() => mark("auth_observer_rejected"),
		);
	}
	const filters = await loadSalesProductionFilterParams(rawSearchParams);
	mark("filters_resolved");
	const resolved = resolveSalesProductionWorkspaceQuery(filters);
	const listInput = {
		...resolved.list,
		size: 20,
	} as RouterInputs["sales"]["productions"];
	const initialTableSettings =
		await getInitialTableSettings("sales-production");
	mark("settings_resolved");

	mark("prefetch_started");
	void batchPrefetch([
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
	]).then(() => mark("summary_settled"), () => mark("summary_rejected"));
	void batchPrefetch([
		trpc.filters.salesProductions.queryOptions(),
	]).then(() => mark("filters_settled"), () => mark("filters_rejected"));

	if (
		resolved.view === "table" &&
		(resolved.tab === "queue" || resolved.tab === "completed")
	) {
		void batchPrefetch([
			trpc.sales.productions.infiniteQueryOptions(listInput, {
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			}),
		]).then(() => mark("list_settled"), () => mark("list_rejected"));
	}

	if (resolved.view === "calendar") {
		const calendarDate = resolveOperationsCalendarDate(
			filters.calendarDate || filters.date,
		);
		const period = getOperationsCalendarPeriod(
			calendarDate,
			filters.calendarView,
		);
		void batchPrefetch([
			filters.calendarMode === "planning" ? trpc.sales.productionPlanningCalendar.queryOptions({
				from: period.from,
				to: period.to,
				q: filters.q,
				priority: filters.priority,
			}) : trpc.sales.productionCalendar.queryOptions({
				from: period.from,
				to: period.to,
				scope: "all",
				q: filters.q,
				assignedToId: filters.assignedToId,
				priority: filters.priority,
			}),
		]).then(() => mark("calendar_settled"), () => mark("calendar_rejected"));
	}

	mark("shell_returned");
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
