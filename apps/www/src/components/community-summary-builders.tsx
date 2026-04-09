"use client";

import { Icons } from "@gnd/ui/icons";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { InventorySummary } from "./inventory-summary";
import NumberFlow from "@number-flow/react";
import { SummaryCardLink } from "./summary-card-link";

export function CommunitySummaryBuilders() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.community.communitySummary.queryOptions({
            type: "builders",
        })
    );

    return (
        <SummaryCardLink
            path="/community/builders"
            summaryProps={{
                Icon: Icons.Package,
                title: "Builders",
                value: <NumberFlow value={data?.value} />,
                subtitle: data?.subtitle,
            }}
        />
    );
}

