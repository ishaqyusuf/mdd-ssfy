// import type { Database } from "@gnd/db/client";
import { shouldSendNotification } from "@gnd/db/queries";

import type { Db } from "@gnd/db";
import AuthNewDeviceLoginEmail from "@gnd/email/emails/auth-new-device-login";
import { JobApprovedEmail } from "@gnd/email/emails/job-approved";
import { JobAssignedEmail } from "@gnd/email/emails/job-assigned";
import { JobPaymentSentEmail } from "@gnd/email/emails/job-payment-sent";
import { JobRejectedEmail } from "@gnd/email/emails/job-rejected";
import { JobTaskConfigureRequestEmail } from "@gnd/email/emails/job-task-configure-request";
import ComposedSalesDocumentEmail from "@gnd/email/emails/composed-sales-document-email";
import DealerMagicLoginLinkEmail from "@gnd/email/emails/dealer-magic-login-link";
import DealerOnboardingEmail from "@gnd/email/emails/dealer-onboarding";
import DealerPasswordResetEmail from "@gnd/email/emails/dealer-password-reset";
import DealerSalesRequestApprovedEmail from "@gnd/email/emails/dealer-sales-request-approved";
import DealerSalesRequestRejectedEmail from "@gnd/email/emails/dealer-sales-request-rejected";
import LoginEmail from "@gnd/email/emails/login-link-email";
import { SalesCustomerPaymentFailedEmail } from "@gnd/email/emails/sales-customer-payment-failed";
import { SalesCustomerPaymentReceivedEmail } from "@gnd/email/emails/sales-customer-payment-received";
import SalesEmail from "@gnd/email/emails/sales-email";
import SalesReminderScheduleAdminNotificationEmail from "@gnd/email/emails/sales-reminder-schedule-admin-notification";
import { SalesRepOnlinePaymentReceived } from "@gnd/email/emails/sales-rep-online-payment-received";
import StorefrontPasswordResetRequest from "@gnd/email/emails/storefront-password-reset-request";
import { render } from "@gnd/email/render";
import { getRecipient, getTestEmails } from "@gnd/utils/envs";
import { nanoid } from "nanoid";
import { type CreateEmailOptions, Resend } from "resend";
import type { EmailInput } from "../base";

export function resolveEmailRecipients(
	targetRecipients: string | string[],
	options?: {
		testEmailMode?: boolean;
	},
): string[] {
	const testEmails = getTestEmails();
	const isTestEnv = process.env.NODE_ENV === "test";

	if ((isTestEnv || options?.testEmailMode) && testEmails.length) {
		return testEmails;
	}

	const recipients = getRecipient(targetRecipients);
	return Array.isArray(recipients) ? recipients : [recipients];
}

export class EmailService {
	private client: Resend;

	constructor(private db: Db) {
		// @ts-ignore
		this.client = new Resend(process.env.RESEND_API_KEY!);
		// env
	}

	async sendTransactional({
		to,
		subject,
		template,
		data,
		from,
	}: {
		to: string;
		subject: string;
		template: string;
		data: Record<string, any>;
		from?: string;
	}) {
		const emailTemplate = this.#getTemplate(template);
		const html = await render(emailTemplate(data as any));

		const recipients = resolveEmailRecipients([to]);

		const response = await this.client.emails.send({
			from: from || "GND Millwork <noreply@gndprodesk.com>",
			to: recipients,
			subject,
			html,
			headers: {
				"X-Entity-Ref-ID": nanoid(),
			},
		});

		if (response.error) {
			console.error("Failed to send transactional email:", response.error);
			throw new Error(`Failed to send email: ${response.error.message}`);
		}
	}

	async sendBulk(emails: EmailInput[], notificationType: string) {
		if (emails.length === 0) {
			return {
				sent: 0,
				skipped: 0,
				failed: 0,
			};
		}

		const eligibleEmails = await this.#filterEligibleEmails(
			emails,
			notificationType,
		);

		if (eligibleEmails.length === 0) {
			return {
				sent: 0,
				skipped: emails.length,
				failed: 0,
			};
		}

		const emailPayloads = await Promise.all(
			eligibleEmails.map((email) => this.#buildEmailPayload(email)),
		);

		// Check if any emails have attachments - batch send doesn't support attachments
		const hasAttachments = emailPayloads.some(
			(payload) => payload.attachments && payload.attachments.length > 0,
		);

		try {
			let sent = 0;
			let failed = 0;

			if (hasAttachments) {
				// Send emails individually when attachments are present
				for (const payload of emailPayloads) {
					try {
						const response = await this.client.emails.send(payload);
						if (response.error) {
							console.error("Failed to send email:", response.error);
							failed++;
						} else {
							sent++;
						}
					} catch (error) {
						console.error("Failed to send email:", error);
						failed++;
					}
				}
			} else {
				// Use batch send when no attachments
				const response = await this.client.batch.send(emailPayloads);

				if (response.error) {
					console.error("Failed to send emails:", response.error);
					failed = eligibleEmails.length;
				} else {
					sent = eligibleEmails.length;
				}
			}

			return {
				sent,
				skipped: emails.length - eligibleEmails.length,
				failed,
			};
		} catch (error) {
			console.error("Failed to send emails:", error);
			return {
				sent: 0,
				skipped: emails.length - eligibleEmails.length,
				failed: eligibleEmails.length,
			};
		}
	}

	async #filterEligibleEmails(emails: EmailInput[], notificationType: string) {
		const eligibleEmails = await Promise.all(
			emails.map(async (email) => {
				// For customer emails (with explicit 'to' field), always send - decision made at notification level
				if (email.to && email.to.length > 0) {
					return email;
				}

				// For team emails (no 'to' field), check user's notification settings
				const shouldSend = await shouldSendNotification(
					this.db,
					email.user.id,
					// email.user.team_id,
					notificationType,
					"email",
				);

				return shouldSend ? email : null;
			}),
		);

		return eligibleEmails.filter(Boolean) as EmailInput[];
	}

	async #buildEmailPayload(email: EmailInput): Promise<CreateEmailOptions> {
		let html: string;
		if (email.template) {
			const template = this.#getTemplate(email.template as string);
			html = await render(template(email.data as any));
		} else {
			throw new Error(`No template found for email: ${email.template}`);
		}

		if (!email.subject) {
			throw new Error(`No subject found for email: ${email.template}`);
		}

		// Use explicit 'to' field if provided, otherwise default to user email.
		// In test/dev contexts route to TEST_EMAILS when configured.
		// For other dev runs, preserve existing dev fallback logic via getRecipient.
		const targetRecipients = email.to || [email.user.email!];
		const recipients = resolveEmailRecipients(targetRecipients, {
			testEmailMode: email.testEmailMode,
		});
		const originalRecipients = Array.isArray(targetRecipients)
			? targetRecipients
			: [targetRecipients];

		const payload: CreateEmailOptions = {
			from: email.from || "gnd <gndbot@gnd.ai>",
			to: recipients,
			subject: email.subject,
			html,
			headers: {
				"X-Entity-Ref-ID": nanoid(),
				...(email.testEmailMode
					? {
							"X-GND-Test-Email-Mode": "true",
							"X-GND-Test-Recipients": recipients.join(", "),
							"X-GND-Original-Recipients": originalRecipients.join(", "),
						}
					: {}),
				...email.headers,
			},
		};

		// Add optional fields if present
		if (email.replyTo) payload.replyTo = email.replyTo;
		if (email.cc && !email.testEmailMode) payload.cc = email.cc;
		if (email.bcc && !email.testEmailMode) payload.bcc = email.bcc;
		if (email.attachments) payload.attachments = email.attachments;
		if (email.tags) payload.tags = email.tags;
		// if (email.text) payload.text = email.text;

		return payload;
	}

	#getTemplate(templateName: string) {
		const templates = {
			"sales-rep-online-payment-received": SalesRepOnlinePaymentReceived,
			"sales-customer-payment-received": SalesCustomerPaymentReceivedEmail,
			"sales-customer-payment-failed": SalesCustomerPaymentFailedEmail,
			"job-assigned": JobAssignedEmail,
			"job-approved": JobApprovedEmail,
			"job-payment-sent": JobPaymentSentEmail,
			"job-rejected": JobRejectedEmail,
			"job-task-configure-request": JobTaskConfigureRequestEmail,
			"composed-sales-document-email": ComposedSalesDocumentEmail,
			"sales-email-reminder": SalesEmail,
			"sales-reminder-schedule-admin-notification":
				SalesReminderScheduleAdminNotificationEmail,
			"dealer-onboarding": DealerOnboardingEmail,
			"dealer-sales-request-approved": DealerSalesRequestApprovedEmail,
			"dealer-sales-request-rejected": DealerSalesRequestRejectedEmail,
			"auth-new-device-login": AuthNewDeviceLoginEmail,
			"dealer-magic-login-link": DealerMagicLoginLinkEmail,
			"dealer-password-reset": DealerPasswordResetEmail,
			"login-link-email": LoginEmail,
			"password-reset-request": StorefrontPasswordResetRequest,
		};

		const template = templates[templateName as keyof typeof templates];

		if (!template) {
			throw new Error(`Unknown email template: ${templateName}`);
		}

		return template;
	}
}
