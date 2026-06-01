import type { Metadata } from "next";
import { unstable_noStore } from "next/cache";

import { LazyProductionWorkerDashboardV2 } from "@/components/production-v2/lazy-boards";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Production Dashboard v2",
    description:
        "Worker-first production dashboard with inline detail, note activity, and mobile-responsive expansion.",
};

export default async function Page() {
    unstable_noStore();
    const queryClient = getQueryClient();
    await queryClient.fetchInfiniteQuery(
        trpc.sales.productionsV2.infiniteQueryOptions({
            scope: "worker",
            production: "pending",
            show: null,
            productionDueDate: null,
            q: null,
            size: 20,
        }) as any,
    );

    return (
        <PageShell>
            <HydrateClient>
                <PageTitle>Production</PageTitle>
                <LazyProductionWorkerDashboardV2 />
            </HydrateClient>
        </PageShell>
    );
}
