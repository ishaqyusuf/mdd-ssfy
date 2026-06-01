"use client";

import dynamic from "next/dynamic";

import { TableSkeleton } from "@/components/tables/skeleton";

const InventoryKindReviewPage = dynamic(
    () =>
        import("./inventory-kind-review-page").then(
            (module) => module.InventoryKindReviewPage,
        ),
    {
        loading: () => <TableSkeleton rows={8} />,
    },
);

export function LazyInventoryKindReviewPage() {
    return <InventoryKindReviewPage />;
}
