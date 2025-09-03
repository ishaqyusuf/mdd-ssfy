import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function useCommunityProjectList(enabled) {
    const trpc = useTRPC();
    const { data } = useQuery(
        trpc.community.projectsList.queryOptions(null, {
            enabled,
        }),
    );
    return {
        list: data! || [],
        options: data?.map((data) => ({
            label: data?.title,
            id: String(data?.id),
            data,
        })),
    };
}

export function useCommunityBuildersList(enabled) {
    const trpc = useTRPC();
    const {
        data: builders,
        isPending,
        error,
    } = useQuery(
        trpc.community.buildersList.queryOptions(null, {
            enabled,
        }),
    );
    return {
        list: builders! || [],
        options: builders?.map((data) => ({
            label: data?.name,
            id: String(data?.id),
            data,
        })),
    };
}

