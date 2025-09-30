import { Suspense } from "react";
import { SummaryCardSkeleton } from "../summary-card";
import { CommunityTotalProjects } from "../community-total-projects";
import { CommunityHomesSummary } from "../community-homes-summary";
import { batchPrefetch } from "@/trpc/server";

export default async function CommunitySummaryWidgets() {
    batchPrefetch([]);
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-6">
            <Suspense fallback={<SummaryCardSkeleton />}>
                <CommunityTotalProjects />
            </Suspense>
            <Suspense fallback={<SummaryCardSkeleton />}>
                <CommunityHomesSummary />
            </Suspense>
            <Suspense fallback={<SummaryCardSkeleton />}>
                <CommunityHomesSummary />
            </Suspense>
            <Suspense fallback={<SummaryCardSkeleton />}>
                <CommunityHomesSummary />
            </Suspense>
        </div>
    );
}

