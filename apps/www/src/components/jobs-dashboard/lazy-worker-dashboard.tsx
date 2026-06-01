"use client";

import dynamic from "next/dynamic";

import { TableSkeleton } from "@/components/tables/skeleton";

const WorkerOverview = dynamic(
    () => import("./worker-overview").then((module) => module.WorkerOverview),
    {
        loading: () => <TableSkeleton rows={6} />,
    },
);

const WorkerPaymentsOverview = dynamic(
    () =>
        import("./worker-payments-overview").then(
            (module) => module.WorkerPaymentsOverview,
        ),
    {
        loading: () => <TableSkeleton rows={6} />,
    },
);

export function LazyWorkerOverview() {
    return <WorkerOverview />;
}

export function LazyWorkerPaymentsOverview() {
    return <WorkerPaymentsOverview />;
}
