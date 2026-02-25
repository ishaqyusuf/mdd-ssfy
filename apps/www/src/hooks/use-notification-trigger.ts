"use client";

import { useCallback } from "react";
import React from "react";
import { useAuth } from "./use-auth";
import { useTaskTrigger } from "./use-task-trigger";
import type { NotificationJobInput } from "@notifications/schemas";

type NotificationChannel = NotificationJobInput["channel"];
type NotificationAuthor = NotificationJobInput["author"];
type NotificationRecipient = NonNullable<NotificationJobInput["recipients"]>[number];
type NotificationEvent<TChannel extends NotificationChannel> = Extract<
    NotificationJobInput,
    { channel: TChannel }
>;
type NotificationTriggerInput<TChannel extends NotificationChannel> = Omit<
    NotificationEvent<TChannel>,
    "channel" | "author"
> & {
    author?: NotificationAuthor;
};

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
            const author =
                input.author ||
                (auth.id
                    ? {
                          id: Number(auth.id),
                          role: "employee" as const,
                      }
                    : undefined);

            if (!author) {
                throw new Error(
                    "useNotificationTrigger requires auth user or explicit author.",
                );
            }

            return task.trigger({
                taskName: "notification",
                payload: {
                    ...input,
                    channel,
                    author,
                } as NotificationEvent<TChannel>,
            });
        },
        [task.trigger, auth.id],
    );

    const makeRecipients = useCallback(
        (role: NotificationRecipient["role"], ...ids: number[]) => {
            const uniqueIds = Array.from(
                new Set(ids.filter((id) => Number.isSafeInteger(id) && id > 0)),
            );
            return uniqueIds.length
                ? [{ ids: uniqueIds, role }]
                : [];
        },
        [],
    );

    const setEmployeeRecipients = useCallback(
        (...ids: number[]) => {
            const next = makeRecipients("employee", ...ids);
            setRecipients(next);
            return next;
        },
        [makeRecipients],
    );

    const setCustomerRecipients = useCallback(
        (...ids: number[]) => {
            const next = makeRecipients("customer", ...ids);
            setRecipients(next);
            return next;
        },
        [makeRecipients],
    );

    return {
        ...task,
        send,
        recipients: storedRecipients,
        setRecipients,
        setEmployeeRecipients,
        setCustomerRecipients,
        jobApproved(
            input: NotificationEvent<"job_approved">["payload"] & {
                recipients?: NotificationEvent<"job_approved">["recipients"];
                author?: NotificationAuthor;
            },
        ) {
            const { recipients, author, ...payload } = input;
            return send("job_approved", {
                payload,
                author,
                recipients:
                    recipients && recipients.length
                        ? recipients
                        : storedRecipients && storedRecipients.length
                            ? storedRecipients
                            : makeRecipients("employee", payload.assignedToId),
            });
        },
        jobRejected(
            input: NotificationEvent<"job_rejected">["payload"] & {
                recipients?: NotificationEvent<"job_rejected">["recipients"];
                author?: NotificationAuthor;
            },
        ) {
            const { recipients, author, ...payload } = input;
            return send("job_rejected", {
                payload,
                author,
                recipients:
                    recipients && recipients.length
                        ? recipients
                        : storedRecipients && storedRecipients.length
                            ? storedRecipients
                            : makeRecipients("employee", payload.assignedToId),
            });
        },
    };
}
