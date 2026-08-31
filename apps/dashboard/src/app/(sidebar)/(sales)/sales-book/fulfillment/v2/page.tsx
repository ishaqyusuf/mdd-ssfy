import { AuthGuard } from "@/components/auth-guard";
import { CreateDispatchDialog } from "@/components/dispatch-admin/create-dispatch-dialog";
import { DispatchAdminTitle } from "@/components/dispatch-admin/dispatch-admin-title";
import { DispatchAdminWorkspaceClient } from "@/components/dispatch-admin/dispatch-admin-workspace-client";
import { normalizeDispatchBacklogSort } from "@/components/dispatch-admin/dispatch-backlog-sort";
import {
    allDispatchStages,
} from "@/components/dispatch-admin/dispatch-list-presets";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { _perm } from "@/components/sidebar-links";
import { loadDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import type { SearchParams } from "nuqs";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return constructMetadata({ title: "Fulfillment | GND" });
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
        size: 20,
    } satisfies RouterInputs["dispatch"]["list"];

    await batchPrefetch([trpc.dispatch.workspaceSummary.queryOptions()]);
    if (filters.section === "backlog") {
        await batchPrefetch([
            trpc.dispatch.backlog.infiniteQueryOptions(
                {
                    q: filters.q,
                    deliveryModes: filters.deliveryModes,
                    sort: normalizeDispatchBacklogSort(sort),
                    size: 20,
                },
                {
                    getNextPageParam: ({ meta }) =>
                        (
                            meta as
                                { cursor?: string | number | null } | undefined
                        )?.cursor,
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
                    size: 20,
                },
                {
                    getNextPageParam: ({ meta }) =>
                        (
                            meta as
                                { cursor?: string | number | null } | undefined
                        )?.cursor,
                },
            ),
        ]);
    } else if (filters.section === "calendar") {
        await batchPrefetch([
            trpc.dispatch.calendar.infiniteQueryOptions(listInput, {
                getNextPageParam: ({ meta }) =>
                    (meta as { cursor?: string | number | null } | undefined)
                        ?.cursor,
            }),
        ]);
    } else {
        await batchPrefetch([
            trpc.dispatch.list.infiniteQueryOptions(
                ["dashboard", "dispatches"].includes(filters.section) &&
                    !filters.stages?.length
                    ? {
                          ...listInput,
                          stages: allDispatchStages,
                      }
                    : listInput,
                {
                    getNextPageParam: ({ meta }) =>
                        (
                            meta as
                                { cursor?: string | number | null } | undefined
                        )?.cursor,
                },
            ),
        ]);
    }

    return (
        <PageShell className="pt-4">
            <HydrateClient>
                <AuthGuard
                    rules={[_perm.is("editOrders")]}
                    Fallback={
                        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                            You do not have permission to access Fulfillment.
                        </div>
                    }
                >
                    <ScrollableContent>
                        <div className="flex flex-col gap-4">
                            <DispatchAdminTitle />
                            <DispatchAdminWorkspaceClient
                                initialSettings={initialSettings}
                            />
                        </div>
                    </ScrollableContent>
                    <CreateDispatchDialog />
                </AuthGuard>
            </HydrateClient>
        </PageShell>
    );
}
