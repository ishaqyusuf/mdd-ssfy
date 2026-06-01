"use client";

import dynamic from "next/dynamic";

import { TableSkeleton } from "@/components/tables/skeleton";

const PackingListClient = dynamic(
    () =>
        import("./packing-list-client").then(
            (module) => module.PackingListClient,
        ),
    {
        loading: () => <TableSkeleton rows={8} />,
    },
);

export function LazyPackingListClient() {
    return <PackingListClient />;
}
