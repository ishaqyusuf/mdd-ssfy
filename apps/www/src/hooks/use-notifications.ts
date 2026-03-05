"use client";

import { useTRPC } from "@/trpc/client";
import { transformNotifications } from "@notifications/notification-center";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useUserNotificationAccount } from "./use-user-notification-account";

export function useNotifications() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { data: notificationAccount } = useUserNotificationAccount();
	const {
		data: activitiesData,
		isLoading,
		error,
	} = useQuery(
		trpc.notes.list.queryOptions({
			contactIds: [notificationAccount?.id || 0],
			maxPriority: 3, // Only fetch notifications (priority <= 3)
			pageSize: 20,
			status: ["unread", "read"], // Exclude archived notifications from query
		}),
	);
	// Separate query for archived notifications
	const { data: archivedActivitiesData, isLoading: archivedIsLoading } =
		useQuery(
			trpc.notes.list.queryOptions({
				maxPriority: 3,
				pageSize: 20,
				status: ["archived"], // Only archived notifications
				contactIds: [notificationAccount?.id || 0],
			}),
		);
	const notifications = useMemo(
		() => transformNotifications(activitiesData?.data || []),
		[activitiesData?.data],
	);
	const archivedNotifications = useMemo(
		() => transformNotifications(archivedActivitiesData?.data || []),
		[archivedActivitiesData?.data],
	);
	const hasUnseenNotifications = useMemo(
		() =>
			notifications.some((notification) => notification.status === "unread"),
		[notifications],
	);
	const markMessageAsRead = (messageId: number) => {};
	return {
		isLoading: isLoading || archivedIsLoading,
		error,
		notifications,
		archived: archivedNotifications,
		hasUnseenNotifications,
		markMessageAsRead,
	};
}
