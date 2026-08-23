import { _trpc } from "@/components/static-trpc";
import { useAuthContext } from "@/hooks/use-auth";
import type { RouterInputs } from "@api/trpc/routers/_app";
import {
	type NotificationChannel,
	NotificationEvent,
	type NotificationRecipients,
	type NotificationTriggerInput,
	buildNotificationEvent,
	createNotificationChannelTriggers,
	makeRecipients,
	normalizeRecipients,
	resolveNotificationAuthor,
} from "@notifications/payload-utils";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";

type MobileNotificationInput = RouterInputs["taskTrigger"]["notification"];
const mobileNotificationChannels: NotificationChannel[] = [
	"job_task_configured",
	"sales_request_packing",
	"dispatch_packing_delay",
	"sales_dispatch_duplicate_alert",
	"sales_dispatch_packing_reset",
];

export function useNotificationTrigger() {
	const auth = useAuthContext();
	const [storedRecipients, setRecipients] =
		useState<NotificationRecipients>(null);
	const { mutateAsync, isPending } = useMutation(
		_trpc.taskTrigger.notification.mutationOptions(),
	);

	const send = useCallback(
		async <TChannel extends NotificationChannel>(
			channel: TChannel,
			input: NotificationTriggerInput<TChannel>,
		) => {
			if (!mobileNotificationChannels.includes(channel)) {
				throw new Error("This mobile notification channel is not supported.");
			}
			const author = resolveNotificationAuthor({
				author: input.author,
				authUserId: auth?.profile?.user?.id,
			});
			const event = buildNotificationEvent(channel, input, author);

			return mutateAsync(event as MobileNotificationInput);
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
