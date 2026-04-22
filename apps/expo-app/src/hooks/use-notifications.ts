import { useTRPC } from "@/trpc/client";
import { transformNotifications } from "@notifications/notification-center";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useUserNotificationAccount } from "./use-user-notification-account";

function useNotificationFeed(
	status: Array<"unread" | "read" | "archived">,
	enabled = true,
) {
	const trpc = useTRPC();
	const { data: notificationAccount } = useUserNotificationAccount();
	const contactIds = notificationAccount?.id ? [notificationAccount.id] : [];

	const query = useInfiniteQuery(
		trpc.notes.list.infiniteQueryOptions(
			{
				contactIds,
				maxPriority: 3,
				pageSize: 20,
				status,
			},
			{
				enabled: enabled && contactIds.length > 0,
				getNextPageParam: (lastPage) => lastPage?.meta?.cursor,
			},
		),
	);

	const notifications = useMemo(() => {
		const items = query.data?.pages.flatMap((page) => page?.data ?? []) ?? [];
		return transformNotifications(items);
	}, [query.data]);

	return {
		...query,
		notifications,
	};
}

export function useNotifications(options?: { includeArchived?: boolean }) {
	const inboxQuery = useNotificationFeed(["unread", "read"]);
	const archivedQuery = useNotificationFeed(
		["archived"],
		options?.includeArchived ?? false,
	);

	const hasUnseenNotifications = useMemo(
		() =>
			inboxQuery.notifications.some(
				(notification) => notification.status === "unread",
			),
		[inboxQuery.notifications],
	);

	const refresh = async () => {
		await Promise.all([inboxQuery.refetch(), archivedQuery.refetch()]);
	};

	return {
		isLoading: inboxQuery.isPending || archivedQuery.isPending,
		error: inboxQuery.error ?? archivedQuery.error,
		hasUnseenNotifications,
		markMessageAsRead: (_messageId: number) => {},
		refresh,
		inbox: {
			items: inboxQuery.notifications,
			isRefreshing: inboxQuery.isRefetching,
			isFetchingNextPage: inboxQuery.isFetchingNextPage,
			hasNextPage: inboxQuery.hasNextPage,
			fetchNextPage: inboxQuery.fetchNextPage,
		},
		archived: {
			items: archivedQuery.notifications,
			isRefreshing: archivedQuery.isRefetching,
			isFetchingNextPage: archivedQuery.isFetchingNextPage,
			hasNextPage: archivedQuery.hasNextPage,
			fetchNextPage: archivedQuery.fetchNextPage,
		},
	};
}
