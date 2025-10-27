"use client";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { InventorySummary } from "./inventory-summary";
import { Package } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { SummaryCardLink } from "./summary-card-link";

export function CommunityHomesSummary() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.community.communitySummary.queryOptions({
            type: "units",
        })
    );

    return (
        <SummaryCardLink
            path="/community/project-units"
            summaryProps={{
                Icon: Package,
                title: "Units",
                value: <NumberFlow value={data?.value} />,
                subtitle: data?.subtitle,
            }}
        />
    );
}

