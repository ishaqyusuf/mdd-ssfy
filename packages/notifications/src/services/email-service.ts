// import type { Database } from "@gnd/db/client";
import { shouldSendNotification } from "@gnd/db/queries";

import type { Db } from "@gnd/db";
import { JobApprovedEmail } from "@gnd/email/emails/job-approved";
import { JobAssignedEmail } from "@gnd/email/emails/job-assigned";
import { JobPaymentSentEmail } from "@gnd/email/emails/job-payment-sent";
import { JobRejectedEmail } from "@gnd/email/emails/job-rejected";
import { JobTaskConfigureRequestEmail } from "@gnd/email/emails/job-task-configure-request";
import LoginEmail from "@gnd/email/emails/login-link-email";
import SalesEmail from "@gnd/email/emails/sales-email";
import SalesReminderScheduleAdminNotificationEmail from "@gnd/email/emails/sales-reminder-schedule-admin-notification";
import { SalesRepOnlinePaymentReceived } from "@gnd/email/emails/sales-rep-online-payment-received";
import StorefrontPasswordResetRequest from "@gnd/email/emails/storefront-password-reset-request";
import { render } from "@gnd/email/render";
import { getRecipient, getTestEmail } from "@gnd/utils/envs";
import { nanoid } from "nanoid";
import { type CreateEmailOptions, Resend } from "resend";
import type { EmailInput } from "../base";

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

		const testEmail = getTestEmail();
		const isTestEnv = process.env.NODE_ENV === "test";
		const recipients =
			isTestEnv && testEmail ? [testEmail] : (getRecipient([to]) as string[]);

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
		// In test/dev contexts route to TEST_EMAIL when configured.
		// For other dev runs, preserve existing dev fallback logic via getRecipient.
		const targetRecipients = email.to || [email.user.email!];
		const testEmail = getTestEmail();
		const isTestEnv = process.env.NODE_ENV === "test";
		const recipients =
			isTestEnv && testEmail ? [testEmail] : getRecipient(targetRecipients);

		const payload: CreateEmailOptions = {
			from: email.from || "gnd <gndbot@gnd.ai>",
			to: recipients,
			subject: email.subject,
			html,
			headers: {
				"X-Entity-Ref-ID": nanoid(),
				...email.headers,
			},
		};

		// Add optional fields if present
		if (email.replyTo) payload.replyTo = email.replyTo;
		if (email.cc) payload.cc = email.cc;
		if (email.bcc) payload.bcc = email.bcc;
		if (email.attachments) payload.attachments = email.attachments;
		if (email.tags) payload.tags = email.tags;
		// if (email.text) payload.text = email.text;

		return payload;
	}

	#getTemplate(templateName: string) {
		const templates = {
			"sales-rep-online-payment-received": SalesRepOnlinePaymentReceived,
			"job-assigned": JobAssignedEmail,
			"job-approved": JobApprovedEmail,
			"job-payment-sent": JobPaymentSentEmail,
			"job-rejected": JobRejectedEmail,
			"job-task-configure-request": JobTaskConfigureRequestEmail,
			"sales-email-reminder": SalesEmail,
			"sales-reminder-schedule-admin-notification":
				SalesReminderScheduleAdminNotificationEmail,
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
