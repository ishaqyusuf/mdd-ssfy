"use client";

import dynamic from "next/dynamic";

import { TableSkeleton } from "@/components/tables/skeleton";

const ProductionAdminBoardV2 = dynamic(
    () => import("./shared").then((module) => module.ProductionAdminBoardV2),
    {
        loading: () => <TableSkeleton rows={8} />,
    },
);

const ProductionWorkerDashboardV2 = dynamic(
    () =>
        import("./shared").then((module) => module.ProductionWorkerDashboardV2),
    {
        loading: () => <TableSkeleton rows={8} />,
    },
);

export function LazyProductionAdminBoardV2() {
    return <ProductionAdminBoardV2 />;
}

export function LazyProductionWorkerDashboardV2() {
    return <ProductionWorkerDashboardV2 />;
}
