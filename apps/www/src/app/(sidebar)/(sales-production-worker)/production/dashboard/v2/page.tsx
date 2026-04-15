import type { Metadata } from "next";
import { unstable_noStore } from "next/cache";

import { ProductionWorkerDashboardV2 } from "@/components/production-v2/shared";
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
    await Promise.all([
        queryClient.fetchQuery(
            trpc.sales.productionDashboardV2.queryOptions({
                scope: "worker",
                production: "pending",
                productionDueDate: null,
                q: null,
            }),
        ),
        queryClient.fetchInfiniteQuery(
            trpc.sales.productionsV2.infiniteQueryOptions({
                scope: "worker",
                production: "pending",
                show: null,
                productionDueDate: null,
                q: null,
            }) as any,
        ),
    ]);

    return (
        <PageShell>
            <HydrateClient>
                <PageTitle>Production</PageTitle>
                <ProductionWorkerDashboardV2 />
            </HydrateClient>
        </PageShell>
    );
}
