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
	if (explicitRecipients?.length) {
		return normalizeRecipients(explicitRecipients);
	}
	if (storedRecipients?.length) {
		return normalizeRecipients(storedRecipients);
	}
	if (fallback?.length) {
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
				makeRecipients("employee", payload.contractorId),
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
				makeRecipients("employee", payload.contractorId),
			);
			return options.send("job_rejected", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		jobDeleted(input: Input<"job_deleted">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("job_deleted", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		jobPaymentSent(input: Input<"job_payment_sent">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
				makeRecipients("employee", payload.contractorId),
			);
			return options.send("job_payment_sent", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		payoutCancelled(input: Input<"payout_cancelled">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
				makeRecipients("employee", payload.contractorId),
			);
			return options.send("payout_cancelled", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		payoutReversed(input: Input<"payout_reversed">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
				makeRecipients("employee", payload.contractorId),
			);
			return options.send("payout_reversed", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		payoutIssues(input: Input<"payout_issues">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
				makeRecipients("employee", payload.contractorId),
			);
			return options.send("payout_issues", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		jobTaskConfigureRequest(input: Input<"job_task_configure_request">) {
			const { recipients, author, builderTaskId, ...payloadRest } = input;
			const payload = {
				...payloadRest,
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
		jobTaskConfigured(input: Input<"job_task_configured">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
				makeRecipients("employee", payload.contractorId),
			);
			return options.send("job_task_configured", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		communityDocuments(input: Input<"community_documents">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("community_documents", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		inventoryInboundActivity(input: Input<"inventory_inbound_activity">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("inventory_inbound_activity", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		communityUnitProductionStarted(
			input: Input<"community_unit_production_started">,
		) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("community_unit_production_started", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		communityUnitProductionStopped(
			input: Input<"community_unit_production_stopped">,
		) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("community_unit_production_stopped", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		communityUnitProductionCompleted(
			input: Input<"community_unit_production_completed">,
		) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("community_unit_production_completed", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		communityUnitProductionBatchUpdated(
			input: Input<"community_unit_production_batch_updated">,
		) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("community_unit_production_batch_updated", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		salesCheckoutSuccess(input: Input<"sales_checkout_success">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_checkout_success", {
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
		simpleSalesDocumentEmail(input: Input<"simple_sales_document_email">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("simple_sales_document_email", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		simpleSalesEmailReminder(input: Input<"simple_sales_email_reminder">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("simple_sales_email_reminder", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		salesInfo(input: Input<"sales_info">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_info", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		inventoryInbound(input: Input<"inventory_inbound">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("inventory_inbound", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		salesItemInfo(input: Input<"sales_item_info">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_item_info", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		salesDispatchInfo(input: Input<"sales_dispatch_info">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_dispatch_info", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		salesDispatchUnassigned(input: Input<"sales_dispatch_unassigned">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_dispatch_unassigned", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		salesDispatchQueued(input: Input<"sales_dispatch_queued">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_dispatch_queued", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		salesDispatchCancelled(input: Input<"sales_dispatch_cancelled">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_dispatch_cancelled", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		salesDispatchCompleted(input: Input<"sales_dispatch_completed">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_dispatch_completed", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		salesDispatchPacked(input: Input<"sales_dispatch_packed">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_dispatch_packed", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		salesDispatchPackingReset(input: Input<"sales_dispatch_packing_reset">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_dispatch_packing_reset", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		salesDispatchInProgress(input: Input<"sales_dispatch_in_progress">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_dispatch_in_progress", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		salesDispatchTripCanceled(input: Input<"sales_dispatch_trip_canceled">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_dispatch_trip_canceled", {
				payload,
				author,
				recipients: resolvedRecipients,
			});
		},
		salesDispatchDateUpdated(input: Input<"sales_dispatch_date_updated">) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_dispatch_date_updated", {
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
		salesDispatchDuplicateAlert(
			input: Input<"sales_dispatch_duplicate_alert">,
		) {
			const { recipients, author, ...payload } = input;
			const resolvedRecipients = resolveRecipients(
				recipients,
				getStoredRecipients(),
			);
			return options.send("sales_dispatch_duplicate_alert", {
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
