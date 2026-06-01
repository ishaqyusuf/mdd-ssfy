"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export function useUserNotificationAccount(enabled = true) {
	const trpc = useTRPC();
	const auth = useAuth();

	return useQuery(
		trpc.user.notificationAccount.queryOptions(undefined, {
			enabled: enabled && auth.enabled && !auth.isPending,
			retry: false,
			staleTime: 5 * 60 * 1000,
		}),
	);
}
