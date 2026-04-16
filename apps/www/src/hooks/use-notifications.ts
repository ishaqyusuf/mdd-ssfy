"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { transformNotifications } from "@notifications/notification-center";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useUserNotificationAccount } from "./use-user-notification-account";

export function useNotifications() {
	const auth = useAuth();
	const trpc = useTRPC();
	const {
		data: notificationAccount,
		isLoading: notificationAccountLoading,
		error: notificationAccountError,
	} = useUserNotificationAccount();
	const notificationAccountId = notificationAccount?.id;
	const {
		data: activitiesData,
		isLoading,
		error,
	} = useQuery(
		trpc.notes.list.queryOptions({
			contactIds: notificationAccountId ? [notificationAccountId] : [],
			maxPriority: 3, // Only fetch notifications (priority <= 3)
			pageSize: 20,
			status: ["unread", "read"], // Exclude archived notifications from query
		}, {
			enabled: auth.enabled && !!notificationAccountId,
		}),
	);
	// Separate query for archived notifications
	const { data: archivedActivitiesData, isLoading: archivedIsLoading } =
		useQuery(
			trpc.notes.list.queryOptions({
				maxPriority: 3,
				pageSize: 20,
				status: ["archived"], // Only archived notifications
				contactIds: notificationAccountId ? [notificationAccountId] : [],
			}, {
				enabled: auth.enabled && !!notificationAccountId,
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
		isLoading:
			auth.isPending || notificationAccountLoading || isLoading || archivedIsLoading,
		error: notificationAccountError ?? error,
		notifications,
		archived: archivedNotifications,
		hasUnseenNotifications,
		markMessageAsRead,
	};
}
