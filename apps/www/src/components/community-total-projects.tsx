"use client";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { InventorySummary } from "./inventory-summary";
import { Package } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { cn } from "@gnd/ui/cn";
import { _path, _pathIs } from "./static-trpc";
import Link from "next/link";
import { useMemo } from "react";

export function CommunityTotalProjects() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.community.communitySummary.queryOptions({
            type: "projects",
        }),
    );
    const isSelected = useMemo(() => _pathIs("/community"), [_path]);
    return (
        <Link
            href="/community"
            type="button"
            onClick={(e) => {}}
            className={cn("hidden sm:block text-left")}
        >
            <InventorySummary
                Icon={Package}
                selected={isSelected}
                title="Projects"
                selectable={false}
                value={<NumberFlow value={data?.value} />}
                subtitle={data?.subtitle!}
            />
        </Link>
    );
}

