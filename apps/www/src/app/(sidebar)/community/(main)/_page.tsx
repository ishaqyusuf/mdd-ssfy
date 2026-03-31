import { CommunityDashboard } from "@/components/community-dashboard";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";

import PageShell from "@/components/page-shell";
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { TableSkeleton } from "@/components/tables/skeleton";
import { ErrorFallback } from "@/components/error-fallback";
export async function generateMetadata() {
    return constructMetadata({
        title: "Community Dashboard | GND",
    });
}

export default async function Page() {
    // unstable_noStore();
    batchPrefetch([trpc.community.communityDashboardOverview.queryOptions({})]);

    return (
        <PageShell>
            <div className="flex flex-col gap-6 px-4 sm:px-6">
                <PageTitle>Community Dashboard</PageTitle>
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense fallback={<TableSkeleton />}>
                        <CommunityDashboard />
                    </Suspense>
                </ErrorBoundary>
            </div>
        </PageShell>
    );
}

