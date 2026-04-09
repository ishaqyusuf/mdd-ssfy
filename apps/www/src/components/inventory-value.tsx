"use client";

import { Icons } from "@gnd/ui/icons";
import { useInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { InventorySummary } from "./inventory-summary";
import NumberFlow from "@number-flow/react";

export function InventoryValue() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.inventories.inventorySummary.queryOptions({
            type: "inventory_value",
        }),
    );
    const { setFilters } = useInventoryFilterParams();

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

