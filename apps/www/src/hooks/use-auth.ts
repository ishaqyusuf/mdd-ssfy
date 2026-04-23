"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import type { Roles } from "@gnd/utils/constants";
import { useSession } from "next-auth/react";
import {
	type ReactNode,
	createContext,
	createElement,
	useContext,
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
	const hasSeededPermissions = Boolean(session?.can ?? initialAuth?.can);
	const hasSeededRole = Boolean(session?.role ?? initialAuth?.role);
	const needsAuthQuery = enabled && (!hasSeededPermissions || !hasSeededRole);
	const { isPending, data } = useQuery(
		trpc.user.auth.queryOptions(undefined, {
			enabled: needsAuthQuery,
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes
		}),
	);
	const can =
		session?.can ??
		initialAuth?.can ??
		data?.can ??
		({} as Record<string, boolean>);
	const role = session?.role ?? initialAuth?.role ?? data?.role ?? null;
	const isActuallyPending =
		status === "loading" || (needsAuthQuery && isPending);
	const roleTitle = role?.name as Roles;
	return {
		id: sessionUserId,
		email: session?.user?.email ?? initialAuth?.email ?? null,
		name: session?.user?.name ?? initialAuth?.name ?? null,
		isPending: isActuallyPending,
		can: can as typeof can,
		role,
		roleTitle,
		avatar: initialAuth?.avatar ?? null,
		enabled,
		data,
	};
}
