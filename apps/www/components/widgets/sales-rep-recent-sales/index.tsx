import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";

import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";

import { RecentSalesSkeleton, RecentSalesWidget } from "./recent-sales-widget";
import { SalesRepSalesWidgetHeader } from "./sales-rep-sales-header";

export function SalesRepRecentSales() {
    return (
        <Card className="">
            <SalesRepSalesWidgetHeader />

            <CardContent className="">
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense fallback={<RecentSalesSkeleton />}>
                        <RecentSalesWidget />
                    </Suspense>
                </ErrorBoundary>
            </CardContent>
        </Card>
    );
}
