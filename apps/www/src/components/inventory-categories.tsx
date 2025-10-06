"use client";
import { useInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { InventorySummary } from "./inventory-summary";
import { AlertTriangle } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { cn } from "@gnd/ui/cn";

export function InventoryCategories() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.inventories.inventorySummary.queryOptions({
            type: "categories",
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
                Icon={AlertTriangle}
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

