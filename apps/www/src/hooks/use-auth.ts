"use client";
import { useTRPC } from "@/trpc/client";
import { Roles } from "@gnd/utils/constants";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useDebugToast } from "./use-debug-console";

export function useAuth() {
    const { data: session } = useSession();
    const trpc = useTRPC();
    const { isPending, data } = useQuery(
        trpc.user.auth.queryOptions(undefined, {
            enabled: !!session?.user?.id,
            staleTime: 20 * 60 * 1000, // 20 minutes
            gcTime: 20 * 60 * 1000, // 20 minutes
        }),
    );
    // useDebugToast("AUTH", data);
    const can = data?.can;
    return {
        id: session?.user?.id,
        email: session?.user?.email,
        name: session?.user?.name,
        // can: session?.can,
        can: can || ({} as typeof can),
        role: session?.role,
        roleTitle: session?.role?.name as Roles,
        avatar: null,
    };
}

