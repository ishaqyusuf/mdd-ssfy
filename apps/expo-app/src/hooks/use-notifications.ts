import { useTRPC } from "@/trpc/client";
import { transformNotifications } from "@notifications/notification-center";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useUserNotificationAccount } from "./use-user-notification-account";

export function useNotifications() {
	const trpc = useTRPC();
	const { data: notificationAccount } = useUserNotificationAccount();

	const {
		data: activitiesData,
		isLoading,
		error,
	} = useQuery(
		trpc.notes.list.queryOptions({
			contactIds: [notificationAccount?.id || 0],
			maxPriority: 3,
			pageSize: 20,
			status: ["unread", "read"],
		}),
	);

	const { data: archivedActivitiesData, isLoading: archivedIsLoading } =
		useQuery(
			trpc.notes.list.queryOptions({
				maxPriority: 3,
				pageSize: 20,
				status: ["archived"],
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

	const markMessageAsRead = (_messageId: number) => {};

	return {
		isLoading: isLoading || archivedIsLoading,
		error,
		notifications,
		archived: archivedNotifications,
		hasUnseenNotifications,
		markMessageAsRead,
	};
}
