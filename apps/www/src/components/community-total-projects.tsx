"use client";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { Package } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { _path, _pathIs } from "./static-trpc";
import { SummaryCardLink } from "./summary-card-link";

export function CommunityTotalProjects() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.community.communitySummary.queryOptions({
            type: "projects",
        })
    );
    return (
        <SummaryCardLink
            path="/community"
            summaryProps={{
                Icon: Package,
                title: "Projects",
                value: <NumberFlow value={data?.value} />,
                subtitle: data?.subtitle,
            }}
        />
    );
}

