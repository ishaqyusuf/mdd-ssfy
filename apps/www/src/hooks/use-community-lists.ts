import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export function useCommunityProjectList(enabled) {
    const trpc = useTRPC();
    const { data } = useQuery(
        trpc.community.projectsList.queryOptions(null, {
            enabled,
        }),
    );
    return {
        list: data!,
    };
}

