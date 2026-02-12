"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useUserNotificationAccount() {
    const trpc = useTRPC();
    return useSuspenseQuery(trpc.user.notificationAccount.queryOptions());
}
