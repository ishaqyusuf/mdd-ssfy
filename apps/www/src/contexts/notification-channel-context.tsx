import { useEmployeesList, useRolesList } from "@/hooks/use-data-list";
import { useNotificationChannelParams } from "@/hooks/use-notification-channel-params";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";

type NotificationChannelContextProps = ReturnType<
    typeof useCreateNotificationChannelContext
>;
export const NotificationChannelContext =
    createContext<NotificationChannelContextProps>(undefined as any);
export const NotificationChannelProvider = NotificationChannelContext.Provider;
export const useCreateNotificationChannelContext = () => {
    const { openNotificationChannelId, setParams } =
        useNotificationChannelParams();
    const users = useEmployeesList(!!openNotificationChannelId);
    const roles = useRolesList(!!openNotificationChannelId);
    const { data: selectedEvent } = useQuery(
        useTRPC().notes.getNotificationChannel.queryOptions(
            {
                id: openNotificationChannelId!,
            },
            {
                enabled: !!openNotificationChannelId,
            },
        ),
    );
    const subscribers =
        selectedEvent?.subscriberIds?.map(
            (s) =>
                users?.find((u) => u.id === s) ?? {
                    name: "Unknown User",
                    id: s,
                },
        ) ?? [];

    return {
        users,
        roles,
        subscribers,
        selectedEvent,
        setParams,
    };
};
export const useNotificationChannelContext = () => {
    const context = useContext(NotificationChannelContext);
    if (context === undefined) {
        throw new Error(
            "useNotificationChannelContext must be used within a NotificationChannelProvider",
        );
    }
    return context;
};

