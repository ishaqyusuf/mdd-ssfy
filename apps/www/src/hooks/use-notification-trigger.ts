"use client";

import { useCallback } from "react";
import React from "react";
import { useAuth } from "./use-auth";
import { useTaskTrigger } from "./use-task-trigger";
import {
    buildNotificationEvent,
    createNotificationChannelTriggers,
    makeRecipients,
    normalizeRecipients,
    resolveNotificationAuthor,
    type NotificationChannel,
    type NotificationTriggerInput,
} from "@notifications/payload-utils";
import type { NotificationJobInput } from "@notifications/schemas";

export function useNotificationTrigger(
    props?: Parameters<typeof useTaskTrigger>[0],
) {
    const auth = useAuth();
    const task = useTaskTrigger(props);
    const [storedRecipients, setRecipients] = React.useState<
        NotificationJobInput["recipients"]
    >(null);

    const send = useCallback(
        <TChannel extends NotificationChannel>(
            channel: TChannel,
            input: NotificationTriggerInput<TChannel>,
        ) => {
            const author = resolveNotificationAuthor({
                author: input.author,
                authUserId: auth.id ? Number(auth.id) : undefined,
            });
            const event = buildNotificationEvent(channel, input, author);

            return task.trigger({
                taskName: "notification",
                payload: event as NotificationEvent<TChannel>,
            });
        },
        [task.trigger, auth.id],
    );

    const setEmployeeRecipients = useCallback(
        (...ids: number[]) => {
            const next = normalizeRecipients(makeRecipients("employee", ...ids));
            setRecipients(next);
            return next;
        },
        [],
    );

    const setCustomerRecipients = useCallback(
        (...ids: number[]) => {
            const next = normalizeRecipients(makeRecipients("customer", ...ids));
            setRecipients(next);
            return next;
        },
        [],
    );
    const channelTriggers = createNotificationChannelTriggers({
        send,
        getStoredRecipients: () => storedRecipients,
    });

    return {
        ...task,
        send,
        recipients: storedRecipients,
        setRecipients,
        setEmployeeRecipients,
        setCustomerRecipients,
        ...channelTriggers,
    };
}
