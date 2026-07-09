import { db } from "@gnd/db";
import type { NotificationOptions, NotificationResult } from "@notifications/base";
import {
	type NotificationJobInput,
	notificationJobSchema,
} from "@notifications/schemas";
import { logger, schemaTask, tasks } from "@trigger.dev/sdk/v3";

function isSalesDocumentEmailChannel(channel: NotificationJobInput["channel"]) {
	return (
		channel === "simple_sales_document_email" ||
		channel === "composed_sales_document_email"
	);
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	if (!error || typeof error !== "object") return null;

	const maybeMessage = (error as { message?: unknown }).message;
	return typeof maybeMessage === "string" ? maybeMessage : null;
}

function getSalesDocumentEmailUserErrorMessage(error: unknown) {
	const message = getErrorMessage(error);
	if (!message) return null;

	if (message.includes("No eligible sales found")) {
		return "Email was not sent. The selected sales document is missing a customer email, customer name, or sales rep email.";
	}

	if (message.includes("requires all sales to belong to one recipient")) {
		return "Email was not sent. Select documents for one customer email at a time.";
	}

	return null;
}

function createFailedSalesDocumentEmailResult(
	channel: NotificationJobInput["channel"],
	errorMessage: string,
): NotificationResult {
	return {
		type: channel,
		activities: 0,
		activityIds: [],
		emailAttemptIds: [],
		emails: {
			sent: 0,
			skipped: 0,
			failed: 1,
			errorMessage,
		},
		whatsapp: {
			sent: 0,
			skipped: 0,
			failed: 0,
		},
	};
}

async function isSuperAdminAuthor(author: NotificationJobInput["author"]) {
	if (author.role === "customer") return false;

	const user = await db.users.findUnique({
		where: {
			id: author.id,
		},
		select: {
			roles: {
				select: {
					role: {
						select: {
							name: true,
						},
					},
				},
			},
		},
	});

	return Boolean(
		user?.roles.some(
			(role) => role.role?.name?.toLowerCase() === "super admin",
		),
	);
}

export const notification = schemaTask({
	id: "notification",
	schema: notificationJobSchema,
	machine: "micro",
	maxDuration: 60,
	queue: {
		concurrencyLimit: 5,
	},
	run: async (data) => {
		const { Notifications } = await import("@gnd/notifications");
		const notifications = new Notifications(db);
		const { channel, author, recipients, payload, testEmailMode } =
			data as NotificationJobInput;
		if (channel === "job_task_configured") {
			const jobId = Number((payload as { jobId?: number })?.jobId);
			if (Number.isFinite(jobId) && jobId > 0) {
				await db.jobs.updateMany({
					where: {
						id: jobId,
						status: "Config Requested",
					},
					data: {
						status: "In Progress",
						statusDate: new Date(),
					},
				});
			}
		}
		logger.info("Triggering notification with data:", {
			channel,
			author,
			recipients,
			payload,
			testEmailMode,
		});
		const allowTestEmailMode =
			channel === "auth_master_password_login_alert"
				? Boolean(testEmailMode)
				: Boolean(testEmailMode) && (await isSuperAdminAuthor(author));
		if (testEmailMode && !allowTestEmailMode) {
			logger.warn("Ignoring test email mode for non-super-admin author", {
				channel,
				author,
			});
		}
		const isDirectRecipientEmail =
			channel === "auth_new_device_login" ||
			channel === "auth_master_password_login_alert" ||
			channel === "dealer_magic_login_link" ||
			channel === "dealer_password_reset" ||
			channel === "simple_sales_document_email" ||
			channel === "composed_sales_document_email" ||
			channel === "customer_statement";
		const notificationOptions: NotificationOptions = {
			author: {
				id: author.id,
				role: author.role === "customer" ? "customer" : "employee",
			},
			testEmailMode: allowTestEmailMode,
			recipients: isDirectRecipientEmail
				? undefined
				: (recipients?.map((recipient) => ({
						ids: recipient.ids,
						role: recipient.role,
					})) ?? undefined),
			...(isDirectRecipientEmail
				? {
						includeChannelSubscribers: false,
						allowFallbackRecipient: false,
					}
				: {}),
		};
		const result = await (async () => {
			try {
				return await notifications.create(channel, payload, {
					...notificationOptions,
				});
			} catch (error) {
				const userErrorMessage = isSalesDocumentEmailChannel(channel)
					? getSalesDocumentEmailUserErrorMessage(error)
					: null;

				if (!userErrorMessage) {
					throw error;
				}

				logger.warn("Sales document email was not sent", {
					channel,
					errorMessage: userErrorMessage,
					originalErrorMessage: getErrorMessage(error),
					payload,
				});

				return createFailedSalesDocumentEmailResult(
					channel,
					userErrorMessage,
				);
			}
		})();
		if (
			channel === "sales_dispatch_completed" &&
			(payload as { signature?: unknown }).signature
		) {
			const dispatchId = Number(
				(payload as { dispatchId?: number }).dispatchId,
			);
			const salesId = Number((payload as { salesId?: number }).salesId);
			if (Number.isFinite(dispatchId) && Number.isFinite(salesId)) {
				await tasks.trigger("attach-signed-dispatch-pdf", {
					dispatchId,
					salesId,
					notificationIds: result.activityIds || [],
					notificationId: result.activityIds?.[0] ?? null,
					authorId: author?.id ?? null,
				});
			}
		}
		return result;
	},
});
