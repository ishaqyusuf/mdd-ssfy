"use client";

import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { Icons } from "@gnd/ui/icons";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { InventorySummary } from "./inventory-summary";
import NumberFlow from "@number-flow/react";
import { SummaryCardSkeleton } from "./summary-card";

export function InventoryValue() {
    const trpc = useTRPC();
    const idleQueryEnabled = useIdleQueryEnabled(1000);
    const { data, isPending } = useQuery(
        trpc.inventories.inventorySummary.queryOptions(
            {
                type: "inventory_value",
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
                Icon={Icons.TrendingUp}
                title="Inventory Value"
                value={<NumberFlow value={data?.value} prefix="$ " />}
                subtitle={data?.subtitle!}
            />
        </button>
    );
}
