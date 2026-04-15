"use client";

import {
    SalesKpiWidgetsSkeleton,
} from "@/components/widgets/sales-kpi-widget";
import { WidgetListSkeleton } from "@/components/widgets/widget-skeleton";
import { Card, CardContent, CardHeader } from "@gnd/ui/card";
import dynamic from "next/dynamic";

const Charts = dynamic(
    () => import("@/components/charts/charts").then((mod) => mod.Charts),
    {
        ssr: false,
        loading: () => <ChartPanelSkeleton />,
    },
);

const Widgets = dynamic(
    () => import("@/components/widgets").then((mod) => mod.Widgets),
    {
        ssr: false,
        loading: () => <WidgetsSkeleton />,
    },
);

export function DashboardDeferredSections() {
    return (
        <>
            <div className="mt-8 relative">
                <Charts />
            </div>

            <Widgets />
        </>
    );
}

function ChartPanelSkeleton() {
    return (
        <div className="mt-8">
            <Card>
                <CardHeader>
                    <SalesKpiWidgetsSkeleton />
                </CardHeader>
                <CardContent>
                    <div className="h-[280px] animate-pulse rounded-md bg-muted" />
                </CardContent>
            </Card>
        </div>
    );
}

function WidgetsSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(3)].map((_, index) => (
                <Card key={index}>
                    <CardHeader>
                        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
                        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <WidgetListSkeleton />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
