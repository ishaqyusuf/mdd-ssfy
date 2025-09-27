"use client";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

export function SchemaForm() {
    const trpc = useTRPC();
    const { data, isPending } = useSuspenseQuery(
        trpc.community.getCommunitySchema.queryOptions({}),
    );
    return <div></div>;
}

