"use client";

import dynamic from "next/dynamic";

import { TableSkeleton } from "@/components/tables/skeleton";

const ShelfItemsManager = dynamic(
    () =>
        import("./shelf-items-manager").then(
            (module) => module.ShelfItemsManager,
        ),
    {
        loading: () => <TableSkeleton rows={8} />,
    },
);

export function LazyShelfItemsManager() {
    return <ShelfItemsManager />;
}
