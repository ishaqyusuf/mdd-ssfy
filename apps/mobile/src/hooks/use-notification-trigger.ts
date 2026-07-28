import { _trpc } from "@/components/static-trpc";
import { useAuthContext } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  buildNotificationEvent,
  createNotificationChannelTriggers,
  makeRecipients,
  normalizeRecipients,
  NotificationEvent,
  resolveNotificationAuthor,
  type NotificationChannel,
  type NotificationRecipients,
  type NotificationTriggerInput,
} from "@notifications/payload-utils";

export function useNotificationTrigger() {
  const auth = useAuthContext();
  const [storedRecipients, setRecipients] =
    useState<NotificationRecipients>(null);
  const { mutateAsync, isPending } = useMutation(
    _trpc.taskTrigger.trigger.mutationOptions(),
  );

  const send = useCallback(
    async <TChannel extends NotificationChannel>(
      channel: TChannel,
      input: NotificationTriggerInput<TChannel>,
    ) => {
      const author = resolveNotificationAuthor({
        author: input.author,
        authUserId: auth?.profile?.user?.id,
      });
      const event = buildNotificationEvent(channel, input, author);

      return mutateAsync({
        taskName: "notification",
        payload: event as NotificationEvent<TChannel>,
      });
    },
    [auth?.profile?.user?.id, mutateAsync],
  );
  const channelTriggers = createNotificationChannelTriggers({
    send,
    getStoredRecipients: () => storedRecipients,
  });

  return {
    isPending,
    send,
    recipients: storedRecipients,
    setRecipients,
    setEmployeeRecipients(...ids: number[]) {
      const next = normalizeRecipients(makeRecipients("employee", ...ids));
      setRecipients(next);
      return next;
    },
    setCustomerRecipients(...ids: number[]) {
      const next = normalizeRecipients(makeRecipients("customer", ...ids));
      setRecipients(next);
      return next;
    },
    ...channelTriggers,
  };
}
