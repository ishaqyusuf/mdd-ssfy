import { Suspense } from "react";
import { SummaryCardSkeleton } from "../summary-card";
import { InventoryTotalProducts } from "../inventory-total-products";
import { InventoryValue } from "../inventory-value";
import { InventoryStockLevel } from "../inventory-stock-level";
import { InventoryCategories } from "../inventory-categories";
import { CommunityTotalProjects } from "../community-total-projects";
import { CommunityHomesSummary } from "../community-homes-summary";

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
                <InventoryStockLevel />
            </Suspense>
            <Suspense fallback={<SummaryCardSkeleton />}>
                <InventoryCategories />
            </Suspense>
        </div>
    );
}

