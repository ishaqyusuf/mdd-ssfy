"use client";

import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { Icons } from "@gnd/ui/icons";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { InventorySummary } from "./inventory-summary";
import NumberFlow from "@number-flow/react";
import { SummaryCardSkeleton } from "./summary-card";

export function InventoryCategories() {
    const trpc = useTRPC();
    const idleQueryEnabled = useIdleQueryEnabled(1000);
    const { data, isPending } = useQuery(
        trpc.inventories.inventorySummary.queryOptions(
            {
                type: "categories",
            },
            {
                enabled: idleQueryEnabled,
                refetchOnWindowFocus: false,
                staleTime: 60 * 1000,
            },
        ),
    );

    if (isPending) {
        return <SummaryCardSkeleton />;
    }

    return (
        <button
            type="button"
            onClick={(e) => {}}
            className="hidden sm:block text-left"
        >
            <InventorySummary
                Icon={Icons.AlertTriangle}
                title="Categories"
                value={
                    <NumberFlow
                        value={data?.value}
                        // className={cn(!data?.value || "text-orange-500")}
                    />
                }
                subtitle={`Active categories`}
            />
        </button>
    );
}
