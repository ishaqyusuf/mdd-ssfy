"use client";

import { useTRPC } from "@/trpc/client";
import { Roles } from "@gnd/utils/constants";
import { useQuery } from "@gnd/ui/tanstack";
import { useSession } from "next-auth/react";
import {
    createContext,
    createElement,
    useContext,
    type ReactNode,
} from "react";

export type InitialAuthState = {
    id?: string | null;
    email?: string | null;
    name?: string | null;
    can?: Record<string, boolean> | null;
    role?: { name?: string | null } | null;
    avatar?: string | null;
};

const AuthStateContext = createContext<InitialAuthState | null>(null);

export function AuthStateProvider({
    children,
    value,
}: {
    children: ReactNode;
    value: InitialAuthState | null;
}) {
    return createElement(AuthStateContext.Provider, {
        value,
        children,
    });
}

export function useAuth() {
    const initialAuth = useContext(AuthStateContext);
    const { data: session, status } = useSession();
    const trpc = useTRPC();
    const sessionUserId = session?.user?.id ?? initialAuth?.id ?? null;
    const enabled = !!sessionUserId;
    const { isPending, data } = useQuery(
        trpc.user.auth.queryOptions(undefined, {
            enabled,
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
        }),
    );
    const can = data?.can;
    const isActuallyPending = status === "loading" || (enabled && isPending);
    const role = session?.role ?? initialAuth?.role ?? null;
    const roleTitle = role?.name as Roles;
    const resolvedCan = can || session?.can || initialAuth?.can || {};
    return {
        id: sessionUserId,
        email: session?.user?.email ?? initialAuth?.email ?? null,
        name: session?.user?.name ?? initialAuth?.name ?? null,
        isPending: isActuallyPending,
        can: resolvedCan as typeof resolvedCan,
        role,
        roleTitle,
        avatar: initialAuth?.avatar ?? null,
        enabled,
        data,
    };
}
