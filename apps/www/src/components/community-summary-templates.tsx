"use client";

import { Icons } from "@gnd/ui/icons";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { InventorySummary } from "./inventory-summary";
import NumberFlow from "@number-flow/react";
import { SummaryCardLink } from "./summary-card-link";

export function CommunitySummaryTemplates() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.community.communitySummary.queryOptions({
            type: "templates",
        })
    );
    return (
        <SummaryCardLink
            path="/community/templates"
            summaryProps={{
                Icon: Icons.Package,
                title: "Templates",
                value: <NumberFlow value={data?.value} />,
                subtitle: data?.subtitle,
            }}
        />
    );
}

