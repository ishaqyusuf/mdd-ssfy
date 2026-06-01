"use client";

import {
    EmptyState as CoreEmptyState,
    NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { useRouter } from "next/navigation";

export function EmptyState() {
    const router = useRouter();

    return (
        <CoreEmptyState
            title="No orders"
            description="Create an order to start tracking sales, production, and fulfillment."
            actionLabel="Create order"
            onAction={() => router.push("/sales-book/create-order")}
        />
    );
}

export function NoResults() {
    const { filters, setFilters } = useSalesOrdersV2FilterParams();

    return (
        <CoreNoResults
            onClear={() => {
                setFilters(
                    Object.fromEntries(
                        Object.keys(filters).map((key) => [key, null]),
                    ) as typeof filters,
                );
            }}
        />
    );
}
