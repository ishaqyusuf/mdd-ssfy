import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export function useUserNotificationAccount() {
  const trpc = useTRPC();
  return useQuery(trpc.user.notificationAccount.queryOptions());
}
