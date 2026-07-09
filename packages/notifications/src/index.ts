import type { Db } from "@gnd/db";
import { logger } from "@gnd/logger";
import { consoleLog } from "@gnd/utils";
import { getTestEmails } from "@gnd/utils/envs";
import { createActivity, createNote } from "./activities";
import type {
	EmailInput,
	NotificationHandler,
	NotificationOptions,
	NotificationResult,
	UserData,
} from "./base";
import {
	getSubscribersAccount,
	getSubscribersForNotificationType,
} from "./channel-subscribers";
import {
	type CreateActivityInput,
	type NotificationTypes,
	createActivitySchema,
} from "./schemas";
import {
	type EmailDeliveryResult,
	type EmailSendBulkResult,
	EmailService,
} from "./services/email-service";
import { WhatsAppService } from "./services/whatsapp-service";
import { authMasterPasswordLoginAlert } from "./types/auth-master-password-login-alert";
import { authNewDeviceLogin } from "./types/auth-new-device-login";
import { communityDocuments } from "./types/community-documents";
import { communityUnitProductionBatchUpdated } from "./types/community-unit-production-batch-updated";
import { communityUnitProductionCompleted } from "./types/community-unit-production-completed";
import { communityUnitProductionStarted } from "./types/community-unit-production-started";
import { communityUnitProductionStopped } from "./types/community-unit-production-stopped";
import { composedSalesDocumentEmail } from "./types/composed-sales-document-email";
import { customerStatement } from "./types/customer-statement";
import { dealerMagicLoginLink } from "./types/dealer-magic-login-link";
import { dealerOnboarding } from "./types/dealer-onboarding";
import { dealerPasswordReset } from "./types/dealer-password-reset";
import { dealerProfileUpdated } from "./types/dealer-profile-updated";
import { dealerSalesRequest } from "./types/dealer-sales-request";
import { dispatchPackingDelay } from "./types/dispatch-packing-delay";
import { employeeAccessRevoked } from "./types/employee-access-revoked";
import { employeeDocumentReview } from "./types/employee-document-review";
import { inventoryInbound } from "./types/inventory-inbound";
import { inventoryInboundActivity } from "./types/inventory-inbound-activity";
import { jobApproved } from "./types/job-approved";
import { jobAssigned } from "./types/job-assigned";
import { jobDeleted } from "./types/job-deleted";
import { jobPaymentSent } from "./types/job-payment-sent";
import { jobRejected } from "./types/job-rejected";
import { jobReviewRequested } from "./types/job-review-requested";
import { jobSubmitted } from "./types/job-submitted";
import { jobTaskConfigured } from "./types/job-task-configured";
import { jobTaskConfigureRequest } from "./types/job-tasks-configure-request";
import { payoutCancelled } from "./types/payout-cancelled";
import { payoutIssues } from "./types/payout-issues";
import { payoutReversed } from "./types/payout-reversed";
import { quoteAccepted } from "./types/quote-accepted";
import { salesCheckoutSuccess } from "./types/sales-checkout-success";
import { salesCustomerPaymentFailed } from "./types/sales-customer-payment-failed";
import { salesCustomerPaymentReceived } from "./types/sales-customer-payment-received";
import { salesDispatchAssigned } from "./types/sales-dispatch-assigned";
import { salesDispatchCancelled } from "./types/sales-dispatch-cancelled";
import { salesDispatchCompleted } from "./types/sales-dispatch-completed";
import { salesDispatchDateUpdated } from "./types/sales-dispatch-date-updated";
import { salesDispatchDuplicateAlert } from "./types/sales-dispatch-duplicate-alert";
import { salesDispatchInProgress } from "./types/sales-dispatch-in-progress";
import { salesDispatchInfo } from "./types/sales-dispatch-info";
import { salesDispatchPacked } from "./types/sales-dispatch-packed";
import { salesDispatchPackingReset } from "./types/sales-dispatch-packing-reset";
import { salesDispatchQueued } from "./types/sales-dispatch-queued";
import { salesDispatchTripCanceled } from "./types/sales-dispatch-trip-canceled";
import { salesDispatchUnassigned } from "./types/sales-dispatch-unassigned";
import { salesEmailReminder } from "./types/sales-email-reminder";
import { salesInfo } from "./types/sales-info";
import { salesItemInfo } from "./types/sales-item-info";
import { salesMarkedAsProductionCompleted } from "./types/sales-marked-as-production-completed";
import { salesPackingList } from "./types/sales-packing-list";
import { salesPaymentRecorded } from "./types/sales-payment-recorded";
import { salesPaymentRefunded } from "./types/sales-payment-refunded";
import { salesProductionAllCompleted } from "./types/sales-production-all-completed";
import { salesProductionAssigned } from "./types/sales-production-assigned";
import { salesReminderScheduleAdminNotification } from "./types/sales-reminder-schedule-admin-notification";
import { salesRequestPacking } from "./types/sales-request-packing";
import { simpleSalesDocumentEmail } from "./types/simple-sales-document-email";
import { simpleSalesEmailReminder } from "./types/simple-sales-email-reminder";
export {
	activityAnd,
	activityAnyTag,
	activityAnyTagIn,
	activityOr,
	activityTag,
	activityTagIn,
	getActivityTree,
	getActivityTagSuggestions,
	type ActivityTagFilterNode,
	type ActivityTreeNode,
	type ActivityTagSuggestion,
	type ActivityTagFilter,
	type ActivityTagName,
	type GetActivityTreeQuery,
	type GetActivityTagSuggestionsQuery,
} from "./activity-tree";
const handlers = {
	sales_checkout_success: salesCheckoutSuccess,
	sales_customer_payment_received: salesCustomerPaymentReceived,
	sales_customer_payment_failed: salesCustomerPaymentFailed,
	dealer_onboarding: dealerOnboarding,
	dealer_profile_updated: dealerProfileUpdated,
	auth_new_device_login: authNewDeviceLogin,
	auth_master_password_login_alert: authMasterPasswordLoginAlert,
	dealer_magic_login_link: dealerMagicLoginLink,
	dealer_password_reset: dealerPasswordReset,
	dealer_sales_request: dealerSalesRequest,
	quote_accepted: quoteAccepted,
	job_assigned: jobAssigned,
	job_submitted: jobSubmitted,
	job_approved: jobApproved,
	job_rejected: jobRejected,
	job_deleted: jobDeleted,
	job_payment_sent: jobPaymentSent,
	payout_cancelled: payoutCancelled,
	payout_reversed: payoutReversed,
	payout_issues: payoutIssues,
	job_review_requested: jobReviewRequested,
	job_task_configure_request: jobTaskConfigureRequest,
	job_task_configured: jobTaskConfigured,
	employee_document_review: employeeDocumentReview,
	employee_access_revoked: employeeAccessRevoked,
	community_documents: communityDocuments,
	inventory_inbound: inventoryInbound,
	inventory_inbound_activity: inventoryInboundActivity,
	community_unit_production_started: communityUnitProductionStarted,
	community_unit_production_stopped: communityUnitProductionStopped,
	community_unit_production_completed: communityUnitProductionCompleted,
	community_unit_production_batch_updated: communityUnitProductionBatchUpdated,
	sales_dispatch_assigned: salesDispatchAssigned,
	sales_dispatch_created: salesDispatchAssigned,
	sales_dispatch_queued: salesDispatchQueued,
	sales_dispatch_cancelled: salesDispatchCancelled,
	sales_dispatch_completed: salesDispatchCompleted,
	sales_dispatch_packed: salesDispatchPacked,
	sales_dispatch_packing_reset: salesDispatchPackingReset,
	sales_dispatch_in_progress: salesDispatchInProgress,
	sales_dispatch_trip_canceled: salesDispatchTripCanceled,
	sales_dispatch_date_updated: salesDispatchDateUpdated,
	sales_dispatch_unassigned: salesDispatchUnassigned,
	sales_marked_as_production_completed: salesMarkedAsProductionCompleted,
	sales_production_all_completed: salesProductionAllCompleted,
	sales_email_reminder: salesEmailReminder,
	composed_sales_document_email: composedSalesDocumentEmail,
	simple_sales_document_email: simpleSalesDocumentEmail,
	simple_sales_email_reminder: simpleSalesEmailReminder,
	customer_statement: customerStatement,
	sales_reminder_schedule_admin_notification:
		salesReminderScheduleAdminNotification,
	sales_info: salesInfo,
	sales_item_info: salesItemInfo,
	sales_dispatch_info: salesDispatchInfo,
	sales_request_packing: salesRequestPacking,
	"sales-packing-list": salesPackingList,
	dispatch_packing_delay: dispatchPackingDelay,
	sales_dispatch_duplicate_alert: salesDispatchDuplicateAlert,
	sales_payment_recorded: salesPaymentRecorded,
	sales_payment_refunded: salesPaymentRefunded,
	sales_production_assigned: salesProductionAssigned,
} as const;
import { generateEmailMeta } from "./utils";

function isValidEmail(email?: string | null): email is string {
	if (!email) return false;
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function markActivityAsTestEmail(
	activityInput: CreateActivityInput,
): CreateActivityInput {
	const testEmails = getTestEmails();
	const testEmailsLabel = testEmails.join(", ");
	const customerEmail =
		typeof activityInput.tags?.customerEmail === "string"
			? activityInput.tags.customerEmail
			: null;
	const headline = activityInput.headline || activityInput.subject;
	const suffix =
		testEmails.length && customerEmail
			? ` Test email sent to ${testEmailsLabel} instead of ${customerEmail}.`
			: " Test email mode was used.";

	return {
		...activityInput,
		headline: `${headline}.${suffix}`,
		tags: {
			...activityInput.tags,
			testEmailMode: true,
			testEmailRecipients: testEmails,
			originalCustomerEmail: customerEmail,
		},
	};
}

type SalesDocumentEmailType =
	| "simple_sales_document_email"
	| "composed_sales_document_email";

type SalesEmailAttemptRef = {
	id: string;
	inputIndex: number;
};

type SalesEmailResolvedData = {
	[key: string]: unknown;
	type?: string | null;
	customerEmail?: string | null;
	customerName?: string | null;
	salesRepId?: number | null;
	emailType?: string | null;
	subject?: string | null;
	message?: string | null;
	note?: string | null;
	paymentLink?: string | null;
	pdfLink?: string | null;
	pdfAttachment?: unknown;
	salesIds?: unknown[];
	salesNos?: unknown[];
	sales?: Array<{ orderId?: string | null }>;
	emailAttemptId?: string | null;
	sourceAttemptId?: string | null;
	skipPdfAttachment?: boolean | null;
};

function isSalesDocumentEmailType(
	type: string,
): type is SalesDocumentEmailType {
	return (
		type === "simple_sales_document_email" ||
		type === "composed_sales_document_email"
	);
}

function arrayToText(value: unknown[]) {
	return value.map((item) => String(item)).join(", ");
}

function firstEmail(value: unknown) {
	if (Array.isArray(value)) return value[0] ? String(value[0]) : null;
	return value ? String(value) : null;
}

function stringArray(value: unknown) {
	if (!Array.isArray(value)) return [];
	return value
		.map((item) => (item == null ? null : String(item)))
		.filter((item): item is string => Boolean(item));
}

function numberArray(value: unknown) {
	if (!Array.isArray(value)) return [];
	return value
		.map((item) => Number(item))
		.filter((item) => Number.isFinite(item));
}

function getSalesIds(data: SalesEmailResolvedData) {
	return numberArray(data.salesIds);
}

function getSalesNos(data: SalesEmailResolvedData) {
	const explicitSalesNos = stringArray(data.salesNos);
	if (explicitSalesNos.length) return explicitSalesNos;
	const sales = Array.isArray(data.sales) ? data.sales : [];
	return sales
		.map((sale) => sale?.orderId)
		.filter((orderId): orderId is string => Boolean(orderId));
}

function retryPayloadForSalesEmail(
	type: SalesDocumentEmailType,
	data: SalesEmailResolvedData,
) {
	const salesIds = getSalesIds(data);
	const printType = data.type === "quote" ? "quote" : "order";

	if (type === "composed_sales_document_email") {
		return {
			printType,
			salesIds,
			customerEmail: data.customerEmail,
			customerName: data.customerName,
			subject: data.subject,
			message: data.message || undefined,
		};
	}

	return {
		emailType: data.emailType || "with payment",
		printType,
		salesIds,
		customerEmail: data.customerEmail,
		note: data.note || undefined,
		skipPdfAttachment: data.skipPdfAttachment ?? true,
	};
}

function salesEmailAttemptData({
	type,
	data,
	author,
	emailInput,
	options,
	status,
}: {
	type: SalesDocumentEmailType;
	data: SalesEmailResolvedData;
	author: UserData;
	emailInput: EmailInput | null;
	options?: NotificationOptions;
	status: "SENDING" | "SKIPPED";
}) {
	const salesIds = getSalesIds(data);
	const salesNos = getSalesNos(data);
	const recipientEmail =
		firstEmail(emailInput?.to) || data.customerEmail || null;
	const subject =
		emailInput?.subject ||
		data.subject ||
		(data.type === "quote" ? "GND quote email" : "GND invoice email");
	const message = data.message || data.note || null;

	return {
		status,
		emailKind: type,
		documentType: data.type === "quote" ? "quote" : "order",
		emailType:
			type === "composed_sales_document_email"
				? "custom"
				: data.emailType || "with payment",
		subject,
		message,
		recipientEmail,
		customerName: data.customerName || null,
		customerEmail: data.customerEmail || recipientEmail,
		senderId: author?.id || null,
		salesRepId: data.salesRepId || null,
		provider: "resend",
		providerStatus: status === "SKIPPED" ? "no_valid_recipient" : "pending",
		salesIds,
		salesNos,
		salesIdsText: arrayToText(salesIds),
		salesNosText: arrayToText(salesNos),
		originalAttemptId: data.sourceAttemptId || null,
		metadata: {
			payload: retryPayloadForSalesEmail(type, data),
			testEmailMode: Boolean(options?.testEmailMode),
			sourceAttemptId: data.sourceAttemptId || null,
			from: emailInput?.from || null,
			replyTo: emailInput?.replyTo || null,
			hasAttachment: Boolean(emailInput?.attachments?.length),
			hasPaymentLink: Boolean(data.paymentLink),
			hasPdfLink: Boolean(data.pdfLink),
			hasPdfAttachment: Boolean(data.pdfAttachment),
		},
	};
}

function statusPatchFromDelivery(delivery: EmailDeliveryResult) {
	const now = new Date();
	if (delivery.status === "sent") {
		return {
			status: "SENT" as const,
			provider: "resend",
			providerMessageId: delivery.providerMessageId || null,
			providerStatus: delivery.providerStatus || "accepted",
			errorCode: null,
			errorMessage: null,
			sentAt: now,
			failedAt: null,
			skippedAt: null,
		};
	}

	if (delivery.status === "failed") {
		return {
			status: "FAILED" as const,
			provider: "resend",
			providerStatus: delivery.providerStatus || "failed",
			errorCode: delivery.errorCode || null,
			errorMessage:
				delivery.errorMessage || "Email provider rejected the request.",
			failedAt: now,
		};
	}

	return {
		status: "SKIPPED" as const,
		provider: "resend",
		providerStatus: delivery.providerStatus || "skipped",
		errorCode: delivery.errorCode || null,
		errorMessage: delivery.errorMessage || null,
		skippedAt: now,
	};
}

export class Notifications {
	#emailService: EmailService;
	#whatsAppService: WhatsAppService;
	#db: Db;
	public emailMeta:
		| {
				from: string;
				replyTo: string;
		  }
		| undefined;

	constructor(
		private db: Db,
		// private logger?: Logger,
	) {
		this.#emailService = new EmailService(db);
		this.#whatsAppService = new WhatsAppService();
		this.#db = db;
	}

	async #createActivities<T extends keyof NotificationTypes>(
		handler: NotificationHandler<NotificationTypes[T]>,
		validatedData: NotificationTypes[T],
		groupId: string,
		// notificationType: string,
		author: UserData,
		// options?: NotificationOptions,
		contacts?: UserData[],
		options?: NotificationOptions,
	) {
		if (handler?.createActivityWithoutContact) {
			const rawActivityInput = handler.createActivity(
				validatedData,
				author,
				contacts?.[0] || author,
			);
			const activityInput = options?.testEmailMode
				? markActivityAsTestEmail(rawActivityInput)
				: rawActivityInput;
			(activityInput as CreateActivityInput & { groupId: string }).groupId =
				groupId;
			const validatedActivity = createActivitySchema.parse(activityInput);
			const activity = await createActivity(
				this.#db,
				validatedActivity,
				author?.id,
			);
			return activity ? [activity] : [];
		}
		console.log("++++++++++++++++++++");
		console.log("Creating activities for users:", contacts);
		const activityPromises = await Promise.all(
			(contacts || [])

				// .filter((a) => a.inAppNotification)
				.map(async (user: UserData) => {
					// if(!user?.inAppNotification)
					// return null;
					console.log("Creating activity for user:", user);
					const rawActivityInput = handler.createActivity(
						validatedData,
						author,
						user,
					);
					const activityInput = options?.testEmailMode
						? markActivityAsTestEmail(rawActivityInput)
						: rawActivityInput;
					// Check if user wants in-app notifications for this type
					// const inAppEnabled = await shouldSendNotification(
					//   this.#db,
					//   user.id,
					//   //  user.team_id,
					//   notificationType,
					//   "in_app",
					// );

					// Apply priority logic based on notification preferences
					// let finalPriority = activityInput.priority;

					// // Runtime priority override takes precedence
					// if (options?.priority !== undefined) {
					//   finalPriority = options.priority;
					// } else if (!inAppEnabled) {
					//   // If in-app notifications are disabled, set to low priority (7-10 range)
					//   // so it's not visible in the notification center
					//   finalPriority = Math.max(7, activityInput.priority + 4);
					//   finalPriority = Math.min(10, finalPriority); // Cap at 10
					// }

					// activityInput.priority = finalPriority;
					(activityInput as CreateActivityInput & { groupId: string }).groupId =
						groupId;

					// Validate with Zod schema
					const validatedActivity = createActivitySchema.parse(activityInput);

					// Create activity directly using DB query
					return createActivity(this.#db, validatedActivity, author?.id, [
						user.id,
					]);
				}),
		);
		return activityPromises.filter(Boolean);
	}
	#createEmailInput<T extends keyof NotificationTypes>(
		handler: NotificationHandler<NotificationTypes[T]>,
		validatedData: NotificationTypes[T],
		author: UserData,
		user: UserData,
		// teamContext: { id: string; name: string; inboxId: string },
		options?: NotificationOptions,
	): EmailInput {
		if (!handler.createEmail) {
			throw new Error("Notification handler does not support email.");
		}
		// Create email input using handler's createEmail function
		const customEmail = handler.createEmail(
			validatedData,
			author,
			user,
			this.emailMeta,
			// , teamContext
		);
		// user.email
		const baseEmailInput: EmailInput = {
			user,
			testEmailMode: options?.testEmailMode,
			...this.emailMeta,
			...customEmail,
		};

		// Apply runtime options (highest priority)
		// Extract non-email options first
		// const {
		//   // priority, sendEmail,
		//   ...resendOptions } = options || {};
		// if (Object.keys(resendOptions).length > 0) {
		//   Object.assign(baseEmailInput, resendOptions);
		// }

		return baseEmailInput;
	}
	#createWhatsAppInput<T extends keyof NotificationTypes>(
		handler: NotificationHandler<NotificationTypes[T]>,
		validatedData: NotificationTypes[T],
		author: UserData,
		user: UserData,
	) {
		if (!handler.createWhatsApp) {
			throw new Error("Notification handler does not support WhatsApp.");
		}
		return handler.createWhatsApp(validatedData, author, user);
	}
	async saveNote(
		data: Parameters<typeof createNote>[1],
		authId: Parameters<typeof createNote>[2],
	) {
		return createNote(this.#db, data, authId);
	}

	async #prepareSalesEmailAttempts<T extends keyof NotificationTypes>(
		type: T,
		data: NotificationTypes[T],
		author: UserData,
		options: NotificationOptions | undefined,
		emailInputs: EmailInput[],
	): Promise<SalesEmailAttemptRef[]> {
		if (!isSalesDocumentEmailType(type as string)) return [];
		const db = this.#db.salesEmailAttempt;
		if (!db) return [];

		const salesData = data as SalesEmailResolvedData;
		const inputs = emailInputs.length ? emailInputs : [null];
		const status = emailInputs.length ? "SENDING" : "SKIPPED";
		const refs: SalesEmailAttemptRef[] = [];

		for (const [index, emailInput] of inputs.entries()) {
			const attemptData = salesEmailAttemptData({
				type: type as SalesDocumentEmailType,
				data: salesData,
				author,
				emailInput,
				options,
				status,
			});
			const existingAttemptId =
				typeof salesData.emailAttemptId === "string"
					? salesData.emailAttemptId
					: null;

			if (existingAttemptId && index === 0) {
				await db.updateMany({
					where: {
						id: existingAttemptId,
						deletedAt: null,
					},
					data: attemptData,
				});
				refs.push({ id: existingAttemptId, inputIndex: index });
				continue;
			}

			const created = await db.create({
				data: attemptData,
				select: {
					id: true,
				},
			});
			refs.push({ id: created.id, inputIndex: index });
		}

		return refs;
	}

	async #completeSalesEmailAttempts(
		attempts: SalesEmailAttemptRef[],
		result: EmailSendBulkResult,
	) {
		if (!attempts.length) return;
		const db = this.#db.salesEmailAttempt;
		if (!db) return;

		const deliveryByInputIndex = new Map(
			result.deliveries.map((delivery) => [delivery.inputIndex, delivery]),
		);

		await Promise.all(
			attempts.map(async (attempt) => {
				const delivery = deliveryByInputIndex.get(attempt.inputIndex);
				if (!delivery) return;

				await db.updateMany({
					where: {
						id: attempt.id,
						deletedAt: null,
					},
					data: statusPatchFromDelivery(delivery),
				});
			}),
		);
	}

	async create<T extends keyof NotificationTypes>(
		type: T,
		payload: Omit<NotificationTypes[T], "users">,
		// userIds?: number[],
		// author: UserData,
		options?: NotificationOptions,
		// contacts?: UserData[],
	): Promise<NotificationResult> {
		const includeChannelSubscribers =
			options?.includeChannelSubscribers ?? true;
		const allowFallbackRecipient = options?.allowFallbackRecipient ?? true;

		const authorAccountsPromise = (async (): Promise<UserData[]> => {
			if (options?.authorContact) {
				return [options.authorContact];
			}
			if (!options?.author?.id) {
				return [];
			}
			return getSubscribersAccount(this.#db, [options.author.id], {
				role: options.author.role ?? "employee",
				channelName: type as string,
			});
		})();
		const recipientAccountPromises =
			options?.recipients?.map((recipient) =>
				getSubscribersAccount(this.#db, recipient.ids || [], {
					role: recipient.role ?? "employee",
					channelName: type as string,
				}),
			) || [];
		const channelSubscribersPromise = (async (): Promise<UserData[]> => {
			if (!includeChannelSubscribers) {
				return [];
			}
			return getSubscribersForNotificationType(this.#db, type as string);
		})();
		const [author, ...contactsRaw] = (
			await Promise.all([
				authorAccountsPromise,
				...recipientAccountPromises,
				channelSubscribersPromise,
			])
		).flat();

		const fallbackContacts =
			allowFallbackRecipient && contactsRaw.length === 0
				? (
						await getSubscribersAccount(this.#db, [1], {
							role: "employee",
							channelName: type as string,
						})
					)?.map((a) => ({
						...a,
						emailNotification: true,
						inAppNotification: true,
						whatsAppNotification: true,
					}))
				: [];
		const contacts = [...contactsRaw, ...fallbackContacts].filter(
			(contact, index, arr) => {
				// if (!contact?.id || contact.id === author?.id)
				// 	return false;
				return arr.findIndex((item) => item?.id === contact.id) === index;
			},
		);
		this.emailMeta = author
			? generateEmailMeta(author, type)
			: {
					from: "GND Security <noreply@gndprodesk.com>",
					replyTo: "noreply@gndprodesk.com",
				};

		logger.info("Fetched author and contacts", author);

		// if (!teamInfo) {
		//   throw new Error(`Team not found: ${teamId}`);
		// }

		// if (teamMembers.length === 0) {
		//   return {
		//     type: type as string,
		//     activities: 0,
		//     emails: { sent: 0, skipped: 0, failed: 0 },
		//   };
		// }

		// Transform team members to UserData format
		// const users = teamMembers;

		const rawData = { ...payload } as NotificationTypes[T];
		const handler = handlers[type as keyof typeof handlers];
		const resolvedAuthor = author as UserData;
		const data = ((await handler?.extendData?.(
			this.#db,
			rawData,
			resolvedAuthor,
		)) ?? rawData) as NotificationTypes[T];

		// return null;
		return this.#createInternal(type, data, resolvedAuthor, options, contacts);
	}

	async #createInternal<T extends keyof NotificationTypes>(
		type: T,
		data: NotificationTypes[T],
		author: UserData,
		options?: NotificationOptions,
		contacts?: UserData[],
		// teamInfo?: { id: string; name: string | null; inboxId: string | null },
	): Promise<NotificationResult> {
		const handler = handlers[type as keyof typeof handlers];
		// const { author, contacts } = options;
		if (!handler) {
			throw new Error(`Unknown notification type: ${type}`);
		}

		try {
			// Validate input data with the handler's schema
			const validatedData = handler.schema.parse(data);

			const groupId = crypto.randomUUID();
			// Generate a single group ID for all related activities

			// Create activities for each user
			const activities = handler.skipActivity
				? []
				: await this.#createActivities(
						handler,
						validatedData,
						groupId,
						// type as string,
						author,
						contacts,
						options,
					);
			//   return null as any;
			// CONDITIONALLY send emails
			let emails = {
				sent: 0,
				skipped: contacts?.length || 0,
				failed: 0,
			};
			let emailAttemptIds: string[] = [];

			// const sendEmail = options?.sendEmail ?? false;

			// Send emails if requested and handler supports email
			if (handler?.createEmail) {
				const directEmailContact =
					handler.createDirectEmailContact?.(validatedData, author) ?? null;
				const emailContacts = [
					...(contacts || []),
					...(directEmailContact ? [directEmailContact] : []),
				].filter(
					(user: UserData) =>
						user.emailNotification && isValidEmail(user.email),
				);
				const totalEmailCandidates =
					(contacts?.length || 0) + (directEmailContact ? 1 : 0);
				const filteredOutCount = totalEmailCandidates - emailContacts.length;

				const emailInputs = emailContacts.map((user: UserData) =>
					this.#createEmailInput(
						handler,
						validatedData,
						author,
						user,
						// teamContext,
						options,
					),
				);
				const salesEmailAttempts = await this.#prepareSalesEmailAttempts(
					type,
					validatedData,
					author,
					options,
					emailInputs,
				);
				emailAttemptIds = salesEmailAttempts.map((attempt) => attempt.id);

				if (!emailInputs.length) {
					emails = {
						sent: 0,
						skipped: totalEmailCandidates,
						failed: 0,
					};
					await this.#completeSalesEmailAttempts(salesEmailAttempts, {
						sent: 0,
						skipped: totalEmailCandidates,
						failed: 0,
						deliveries: salesEmailAttempts.map((attempt) => ({
							inputIndex: attempt.inputIndex,
							status: "skipped",
							providerStatus: "no_valid_recipient",
						})),
					});
				} else {
					console.log("📨 Email inputs for team:", emailInputs.length);

					const emailResult = await this.#emailService.sendBulk(
						emailInputs,
						type as string,
					);
					emails = {
						sent: emailResult.sent,
						skipped: emailResult.skipped + filteredOutCount,
						failed: emailResult.failed || 0,
					};
					await this.#completeSalesEmailAttempts(
						salesEmailAttempts,
						emailResult,
					);

					console.log("📨 Email result for team:", {
						sent: emails.sent,
						skipped: emails.skipped,
						failed: emails.failed || 0,
					});
				}
			}

			let whatsapp = {
				sent: 0,
				skipped: contacts?.length || 0,
				failed: 0,
			};

			if (handler?.createWhatsApp) {
				const whatsAppContacts = (contacts || []).filter(
					(user) => !!user.whatsAppNotification,
				);
				const filteredOutCount =
					(contacts?.length || 0) - whatsAppContacts.length;
				const whatsAppInputs = whatsAppContacts.reduce<
					Array<{ user: UserData; message: string }>
				>((acc, user) => {
					const payload = this.#createWhatsAppInput(
						handler,
						validatedData,
						author,
						user,
					);
					if (payload?.message) {
						acc.push({ user, message: payload.message });
					}
					return acc;
				}, []);

				if (!whatsAppInputs.length) {
					whatsapp = {
						sent: 0,
						skipped: contacts?.length || 0,
						failed: 0,
					};
				} else {
					const result = await this.#whatsAppService.sendBulk(whatsAppInputs);
					whatsapp = {
						sent: result.sent,
						skipped: result.skipped + filteredOutCount,
						failed: result.failed,
					};
				}
			}

			return {
				type: type as string,
				activities: activities.length,
				activityIds: activities.map((activity) => activity.id),
				emailAttemptIds,
				emails,
				whatsapp,
			};
		} catch (error) {
			console.error(`Failed to send notification ${type}:`, error);
			throw error;
		}
	}
}
