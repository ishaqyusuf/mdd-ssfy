"use client";

import dynamic from "next/dynamic";

const WorkOrderFilterChart = dynamic(
    () =>
        import("@/components/work-order-filter-chart").then(
            (mod) => mod.WorkOrderFilterChart,
        ),
    {
        ssr: false,
        loading: () => (
            <div className="h-[80px] w-full rounded-md bg-muted/30" />
        ),
    },
);

export function LazyWorkOrderFilterChart() {
    return <WorkOrderFilterChart />;
}
