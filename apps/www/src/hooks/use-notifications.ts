"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { transformNotifications } from "@notifications/notification-center";
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

type RawNotificationItems = Parameters<typeof transformNotifications>[0];

function useNotificationFeed(
	status: Array<"unread" | "read" | "archived">,
	enabled = true,
	type?: string | null,
) {
	const auth = useAuth();
	const trpc = useTRPC();

	const query = useInfiniteQuery(
		trpc.notes.listMine.infiniteQueryOptions(
			{
				maxPriority: 3,
				pageSize: 20,
				status,
				type: type || undefined,
			},
			{
				enabled: enabled && auth.enabled,
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
	};
}

function useNotificationTypeSummary(
	status: Array<"unread" | "read" | "archived">,
	enabled = true,
) {
	const auth = useAuth();
	const trpc = useTRPC();

	return useQuery(
		trpc.notes.notificationTypeSummary.queryOptions(
			{
				status,
			},
			{
				enabled: enabled && auth.enabled,
			},
		),
	);
}

function useNotificationUnreadCount(enabled = true) {
	const auth = useAuth();
	const trpc = useTRPC();

	return useQuery(
		trpc.notes.unreadNotificationCount.queryOptions(
			{},
			{
				enabled: enabled && auth.enabled,
			},
		),
	);
}

export function useNotifications({
	enabled = true,
	includeArchive = true,
	type = null,
}: {
	enabled?: boolean;
	includeArchive?: boolean;
	type?: string | null;
} = {}) {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const inboxQuery = useNotificationFeed(["unread", "read"], enabled, type);
	const archivedQuery = useNotificationFeed(
		["archived"],
		enabled && includeArchive,
		type,
	);
	const inboxTypeSummaryQuery = useNotificationTypeSummary(
		["unread", "read"],
		enabled,
	);
	const archiveTypeSummaryQuery = useNotificationTypeSummary(
		["archived"],
		enabled && includeArchive,
	);
	const unreadCountQuery = useNotificationUnreadCount(enabled);

	const unreadCount = unreadCountQuery.data ?? 0;
	const hasUnseenNotifications = unreadCount > 0;
	const invalidateNotificationLists = useCallback(async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.notes.listMine.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.notes.unreadNotificationCount.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.notes.notificationTypeSummary.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.notes.myNotificationPreferences.pathKey(),
			}),
		]);
	}, [queryClient, trpc]);
	const updateStatusMutation = useMutation(
		trpc.notes.updateNotificationStatus.mutationOptions({
			onSuccess: invalidateNotificationLists,
			onError: (error) => {
				toast.error(error.message || "Unable to update notification");
			},
		}),
	);
	const updateAllStatusMutation = useMutation(
		trpc.notes.updateAllNotificationStatus.mutationOptions({
			onSuccess: invalidateNotificationLists,
			onError: (error) => {
				toast.error(error.message || "Unable to update notifications");
			},
		}),
	);
	const markMessageAsRead = useCallback(
		(messageId: number | string) => {
			updateStatusMutation.mutate({
				activityId: Number(messageId),
				status: "archived",
			});
		},
		[updateStatusMutation],
	);
	const markAllMessagesAsRead = useCallback(() => {
		updateAllStatusMutation.mutate({
			status: "archived",
			fromStatus: ["unread", "read"],
		});
	}, [updateAllStatusMutation]);
	const markAllMessagesAsSeen = useCallback(() => {
		updateAllStatusMutation.mutate({
			status: "read",
			fromStatus: ["unread"],
		});
	}, [updateAllStatusMutation]);

	return {
		isLoading:
			enabled &&
			(auth.isPending ||
				inboxQuery.isPending ||
				(includeArchive && archivedQuery.isPending)),
		error: inboxQuery.error ?? archivedQuery.error,
		notifications: inboxQuery.notifications,
		archived: includeArchive ? archivedQuery.notifications : [],
		hasUnseenNotifications,
		unreadCount,
		markMessageAsRead,
		markAllMessagesAsRead,
		markAllMessagesAsSeen,
		isUpdating:
			updateStatusMutation.isPending || updateAllStatusMutation.isPending,
		inbox: {
			items: inboxQuery.notifications,
			typeSummary: inboxTypeSummaryQuery.data ?? [],
			fetchNextPage: inboxQuery.fetchNextPage,
			hasNextPage: inboxQuery.hasNextPage,
			isFetchingNextPage: inboxQuery.isFetchingNextPage,
		},
		archive: {
			items: archivedQuery.notifications,
			typeSummary: archiveTypeSummaryQuery.data ?? [],
			fetchNextPage: archivedQuery.fetchNextPage,
			hasNextPage: archivedQuery.hasNextPage,
			isFetchingNextPage: archivedQuery.isFetchingNextPage,
		},
	};
}
