"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { transformNotifications } from "@notifications/notification-center";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useUserNotificationAccount } from "./use-user-notification-account";

type RawNotificationItems = Parameters<typeof transformNotifications>[0];

function useNotificationFeed(
	status: Array<"unread" | "read" | "archived">,
	enabled = true,
) {
	const auth = useAuth();
	const trpc = useTRPC();
	const {
		data: notificationAccount,
		isLoading: notificationAccountLoading,
		error: notificationAccountError,
	} = useUserNotificationAccount(enabled);
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
				enabled: enabled && auth.enabled && contactIds.length > 0,
				getNextPageParam: (lastPage) => lastPage?.meta?.cursor,
			},
		),
	);

	const notifications = useMemo(() => {
		const items = query.data?.pages.flatMap((page) => page?.data ?? []) ?? [];
		return transformNotifications(items as RawNotificationItems);
	}, [query.data]);

	return {
		...query,
		notifications,
		notificationAccountLoading,
		notificationAccountError,
	};
}

export function useNotifications({
	enabled = true,
	includeArchive = true,
}: {
	enabled?: boolean;
	includeArchive?: boolean;
} = {}) {
	const auth = useAuth();
	const inboxQuery = useNotificationFeed(["unread", "read"], enabled);
	const archivedQuery = useNotificationFeed(
		["archived"],
		enabled && includeArchive,
	);

	const hasUnseenNotifications = useMemo(
		() =>
			inboxQuery.notifications.some(
				(notification) => notification.status === "unread",
			),
		[inboxQuery.notifications],
	);

	return {
		isLoading:
			enabled &&
			(auth.isPending ||
				inboxQuery.notificationAccountLoading ||
				inboxQuery.isPending ||
				(includeArchive && archivedQuery.isPending)),
		error:
			inboxQuery.notificationAccountError ??
			inboxQuery.error ??
			archivedQuery.error,
		notifications: inboxQuery.notifications,
		archived: includeArchive ? archivedQuery.notifications : [],
		hasUnseenNotifications,
		markMessageAsRead: (_messageId: number) => {},
		inbox: {
			items: inboxQuery.notifications,
			fetchNextPage: inboxQuery.fetchNextPage,
			hasNextPage: inboxQuery.hasNextPage,
			isFetchingNextPage: inboxQuery.isFetchingNextPage,
		},
		archive: {
			items: archivedQuery.notifications,
			fetchNextPage: archivedQuery.fetchNextPage,
			hasNextPage: archivedQuery.hasNextPage,
			isFetchingNextPage: archivedQuery.isFetchingNextPage,
		},
	};
}
