import { AuthGuard } from "@/components/auth-guard";
import { FulfillmentCalendarWorkspace } from "@/components/dispatch-admin/fulfillment-calendar-workspace";
import {
	getFulfillmentCalendarPeriod,
	resolveFulfillmentCalendarDate,
} from "@/components/dispatch-admin/fulfillment-calendar-range";
import { FulfillmentListWorkspace } from "@/components/dispatch-admin/fulfillment-list-workspace";
import PageShell from "@/components/page-shell";
import { _perm } from "@/components/sidebar-links";
import { loadDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { redirect } from "next/navigation";
import type { SearchParams } from "nuqs";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Fulfillment | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};
type DispatchInput = RouterInputs["dispatch"]["index"];

function getLegacyCalendarHref() {
	return "/sales-book/fulfillment?tab=calendar&tabName=Calendar";
}

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadDispatchFilterParams(searchParams);

	if (filter.view === "calendar" && filter.tab !== "calendar") {
		redirect(getLegacyCalendarHref());
	}

	const isCalendar = filter.tab === "calendar";
	let workspace: ReactNode;

	if (isCalendar) {
		const calendarDate = resolveFulfillmentCalendarDate(filter.calendarDate);
		const period = getFulfillmentCalendarPeriod(
			calendarDate,
			filter.calendarView,
		);
		await batchPrefetch([
			trpc.dispatch.fulfillmentCalendar.queryOptions({
				from: period.from,
				to: period.to,
			}),
		]);
		workspace = <FulfillmentCalendarWorkspace />;
	} else {
		const {
			view: _view,
			calendarView: _calendarView,
			calendarDate: _calendarDate,
			section: _section,
			dispatchId: _dispatchId,
			dispatchSalesId: _dispatchSalesId,
			exceptionId: _exceptionId,
			sheetMode: _sheetMode,
			detailTab: _detailTab,
			exceptionStatus: _exceptionStatus,
			...dispatchFilter
		} = filter;
		const { sort } = loadSortParams(searchParams);
		const initialSettings = await getInitialTableSettings("sales-dispatch");
		const queryInput = { ...dispatchFilter, sort } as DispatchInput;
		await batchPrefetch([
			trpc.dispatch.index.infiniteQueryOptions(queryInput, {
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			}),
			trpc.dispatch.dispatchSummary.queryOptions(),
			trpc.hrm.getEmployees.queryOptions({
				can: ["viewDelivery"],
				cannot: ["editOrders"],
			}),
		]);
		workspace = <FulfillmentListWorkspace initialSettings={initialSettings} />;
	}

	return (
		<PageShell>
			<HydrateClient>
				<AuthGuard
					rules={[_perm.is("editOrders")]}
					Fallback={
						<div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
							You do not have permission to access fulfillment.
						</div>
					}
				>
					<PageTitle>Fulfillment</PageTitle>
					{workspace}
				</AuthGuard>
			</HydrateClient>
		</PageShell>
	);
}
