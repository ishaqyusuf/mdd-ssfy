"use client";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { InventorySummary } from "./inventory-summary";
import { Package } from "lucide-react";
import NumberFlow from "@number-flow/react";

export function CommunityTotalProjects() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.community.communitySummary.queryOptions({
            type: "projects",
        }),
    );

    return (
        <button
            type="button"
            onClick={(e) => {}}
            className="hidden sm:block text-left"
        >
            <InventorySummary
                Icon={Package}
                title="Projects"
                value={<NumberFlow value={data?.value} />}
                subtitle={data?.subtitle!}
            />
        </button>
    );
}

