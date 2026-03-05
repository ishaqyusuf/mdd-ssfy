import { makeRecipients, normalizeRecipients } from "./recipients";
import type {
	NotificationAuthor,
	NotificationChannel,
	NotificationEvent,
	NotificationRecipients,
	NotificationTriggerInput,
} from "./types";

type SendFn = <TChannel extends NotificationChannel>(
	channel: TChannel,
	input: NotificationTriggerInput<TChannel>,
) => unknown | Promise<unknown>;

type ChannelTriggerFactoryOptions = {
	send: SendFn;
	getStoredRecipients?: () => NotificationRecipients;
};

function resolveRecipients(
	explicitRecipients: NotificationRecipients | undefined,
	storedRecipients: NotificationRecipients | undefined,
	fallback?: NotificationRecipients,
) {
	if (explicitRecipients && explicitRecipients.length) {
		return normalizeRecipients(explicitRecipients);
	}
	if (storedRecipients && storedRecipients.length) {
		return normalizeRecipients(storedRecipients);
	}
	if (fallback && fallback.length) {
		return normalizeRecipients(fallback);
	}
	return null;
}

type Input<T extends NotificationChannel> = NotificationEvent<T>["payload"] & {
	recipients?: NotificationEvent<T>["recipients"];
	author?: NotificationAuthor;
};
export function createNotificationChannelTriggers(
	options: ChannelTriggerFactoryOptions,
) {
	const getStoredRecipients = options.getStoredRecipients || (() => null);

	return {
		jobAssigned(input: Input<"job_assigned">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
				makeRecipients("employee", payload.assignedToId),
			);
			return options.send("job_assigned", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		jobSubmitted(input: Input<"job_submitted">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("job_submitted", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		jobApproved(input: Input<"job_approved">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
				makeRecipients("employee", payload.assignedToId),
			);
			return options.send("job_approved", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},

		jobRejected(input: Input<"job_rejected">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
				makeRecipients("employee", payload.assignedToId),
			);
			return options.send("job_rejected", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		jobTaskConfigureRequest(input: Input<"job_task_configure_request">) {
			const {
				recipients,
				author,
				communityModelInstallCostId,
				builderTaskId,
				...payloadRest
			} = input;
			const payload = {
				...payloadRest,
				communityModelInstallCostId,
				builderTaskId,
			};
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
				// makeRecipients("employee", payload.contractorId),
			);
			return options.send("job_task_configure_request", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		salesEmailReminder(input: Input<"sales_email_reminder">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_email_reminder", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		salesRequestPacking(input: Input<"sales_request_packing">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_request_packing", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		dispatchPackingDelay(input: Input<"dispatch_packing_delay">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("dispatch_packing_delay", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		jobReviewRequested(
			input: NotificationEvent<"job_review_requested">["payload"] & {
				recipients?: NotificationEvent<"job_review_requested">["recipients"];
				author?: NotificationAuthor;
			},
		) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("job_review_requested", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
	};
}
