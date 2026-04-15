import { ProductionWorkspace } from "@/components/production-workspace";
import { authId } from "@/app-deps/(v1)/_actions/utils";
import { loadSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { unstable_noStore } from "next/cache";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Production Worker Dashboard",
    description:
        "Track due work, tomorrow alerts, and your active production queue",
};

export default async function Page(props) {
    unstable_noStore();
    const searchParams = await props.searchParams;
    const queryClient = getQueryClient();
    const filter = loadSalesProductionFilterParams(searchParams);
    const workerId = await authId();
    await Promise.all([
        queryClient.fetchQuery(
            trpc.sales.productionDashboard.queryOptions(
                workerId ? { workerId: Number(workerId) } : undefined,
            ),
        ),
        queryClient.fetchQuery(trpc.filters.salesProductions.queryOptions()),
        queryClient.fetchInfiniteQuery(
            trpc.sales.productionTasks.infiniteQueryOptions(filter) as any,
        ),
    ]);

    // redirect("/production/dashboard/v2"); // Temporary redirect to the new production page while we transition
    return (
        <PageShell>
            <HydrateClient>
                <div className="relative">
                    <ProductionWorkspace mode="worker" />
                </div>
            </HydrateClient>
        </PageShell>
    );
}
