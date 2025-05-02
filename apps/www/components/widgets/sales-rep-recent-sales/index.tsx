import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";

import { RecentSalesSkeleton, RecentSalesWidget } from "./recent-sales-widget";
import { SalesRepSalesWidgetHeader } from "./sales-rep-sales-header";

export function SalesRepRecentSales() {
    return (
        <div className="">
            <SalesRepSalesWidgetHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<RecentSalesSkeleton />}>
                    <RecentSalesWidget />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
