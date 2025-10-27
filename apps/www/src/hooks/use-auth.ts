"use client";
import { useTRPC } from "@/trpc/client";
import { Roles } from "@gnd/utils/constants";
import { useQuery } from "@gnd/ui/tanstack";
import { useSession } from "next-auth/react";

export function useAuth() {
    const { data: session } = useSession();
    const trpc = useTRPC();
    const enabled = !!session?.user?.id;
    const { isPending, data } = useQuery(
        trpc.user.auth.queryOptions(undefined, {
            enabled,
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
        })
    );
    // useDebugToast("AUTH", data);
    const can = data?.can;
    return {
        id: session?.user?.id,
        email: session?.user?.email,
        name: session?.user?.name,
        // can: session?.can,
        can: can || session?.can || ({} as typeof can),
        role: session?.role,
        roleTitle: session?.role?.name as Roles,
        avatar: null,
        isPending,
        enabled,
        data,
    };
}

