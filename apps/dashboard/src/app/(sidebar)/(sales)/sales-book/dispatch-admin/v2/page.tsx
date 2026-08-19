import { AuthGuard } from "@/components/auth-guard";
import { DispatchAdminTitle } from "@/components/dispatch-admin/dispatch-admin-title";
import { DispatchAdminWorkspaceClient } from "@/components/dispatch-admin/dispatch-admin-workspace-client";
import { DispatchSheet } from "@/components/dispatch-admin/dispatch-sheet";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { _perm, _role } from "@/components/sidebar-links";
import { loadDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import type { SearchParams } from "nuqs";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({ title: "Dispatch Admin v2 | GND" });
}

type Props = { searchParams: Promise<SearchParams> };

export default async function DispatchAdminPage({ searchParams }: Props) {
	const params = await searchParams;
	const filters = loadDispatchFilterParams(params);
	const { sort } = loadSortParams(params);
	const initialSettings = await getInitialTableSettings("sales-dispatch");
	const listInput = {
		q: filters.q,
		stages: filters.stages,
		driversId: filters.driversId,
		dueBuckets: filters.dueBuckets,
		deliveryModes: filters.deliveryModes,
		risks: filters.risks,
		scheduleRange: filters.scheduleRange,
		sort,
		section: filters.section,
		size: 50,
	} satisfies RouterInputs["dispatch"]["list"];

	await batchPrefetch([trpc.dispatch.workspaceSummary.queryOptions()]);
	if (filters.section === "backlog") {
		await batchPrefetch([
			trpc.dispatch.backlog.infiniteQueryOptions(
				{
					q: filters.q,
					deliveryModes: filters.deliveryModes,
					size: 50,
				},
				{
					getNextPageParam: ({ meta }) =>
						(meta as { cursor?: string | number | null } | undefined)?.cursor,
				},
			),
		]);
	} else if (filters.section === "drivers") {
		await batchPrefetch([trpc.dispatch.driverWorkload.queryOptions()]);
	} else if (filters.section === "exceptions") {
		await batchPrefetch([
			trpc.dispatch.exceptions.infiniteQueryOptions(
				{
					status: filters.exceptionStatus,
					q: filters.q,
					driversId: filters.driversId,
					size: 50,
				},
				{
					getNextPageParam: ({ meta }) =>
						(meta as { cursor?: string | number | null } | undefined)?.cursor,
				},
			),
		]);
	} else if (filters.section === "calendar") {
		await batchPrefetch([
			trpc.dispatch.calendar.infiniteQueryOptions(listInput, {
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			}),
		]);
	} else {
		await batchPrefetch([
			trpc.dispatch.list.infiniteQueryOptions(
				filters.section === "dashboard"
					? {
							...listInput,
							stages: [
								"ready_to_assign",
								"assigned",
								"packing",
								"packing_blocked",
								"ready_to_load",
								"in_transit",
							],
						}
					: listInput,
				{
					getNextPageParam: ({ meta }) =>
						(meta as { cursor?: string | number | null } | undefined)?.cursor,
				},
			),
		]);
	}

	return (
		<PageShell className="pt-4">
			<HydrateClient>
				<AuthGuard
					rules={[_role.is("Super Admin"), _perm.is("editOrders")]}
					Fallback={
						<div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
							You do not have permission to access Dispatch Admin v2.
						</div>
					}
				>
					<ScrollableContent>
						<div className="flex flex-col gap-4">
							<DispatchAdminTitle />
							<DispatchAdminWorkspaceClient initialSettings={initialSettings} />
						</div>
					</ScrollableContent>
					<DispatchSheet />
				</AuthGuard>
			</HydrateClient>
		</PageShell>
	);
}
