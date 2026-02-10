"use client";
import { useTRPC } from "@/trpc/client";
import { Roles } from "@gnd/utils/constants";
import { useQuery } from "@gnd/ui/tanstack";
import { useSession } from "next-auth/react";

export function useAuth() {
    const { data: session, status } = useSession();
    const trpc = useTRPC();
    const enabled = !!session?.user?.id;
    const { isPending, data } = useQuery(
        trpc.user.auth.queryOptions(undefined, {
            enabled,
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
        }),
    );
    const can = data?.can;
    const isActuallyPending = status === "loading" || (enabled && isPending);
    const roleTitle = session?.role?.name as Roles;
    return {
        id: session?.user?.id,
        email: session?.user?.email,
        name: session?.user?.name,
        // can: session?.can,
        isPending: isActuallyPending,
        can: can || session?.can || ({} as typeof can),
        role: session?.role,
        roleTitle,
        avatar: null,
        enabled,
        data,
    };
}

