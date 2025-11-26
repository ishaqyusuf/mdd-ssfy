import { Suspense } from "react";
import { SummaryCardSkeleton } from "../summary-card";
import { CommunityTotalProjects } from "../community-total-projects";
import { CommunityHomesSummary } from "../community-homes-summary";
import { batchPrefetch } from "@/trpc/server";
import { CommunitySummaryBuilders } from "../community-summary-builders";
import { CommunitySummaryTemplates } from "../community-summary-templates";

export default async function CommunitySummaryWidgets() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-6">
            <Suspense fallback={<SummaryCardSkeleton />}>
                <CommunityTotalProjects />
            </Suspense>
            <Suspense fallback={<SummaryCardSkeleton />}>
                <CommunityHomesSummary />
            </Suspense>
            <Suspense fallback={<SummaryCardSkeleton />}>
                <CommunitySummaryTemplates />
            </Suspense>
            <Suspense fallback={<SummaryCardSkeleton />}>
                <CommunitySummaryBuilders />
            </Suspense>
        </div>
    );
}

