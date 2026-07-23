import { logger } from "@gnd/logger";
import type { UserData } from "../base";
import { normalizeCustomerPhoneNumber } from "../phone-number";

export type SmsDeliveryResult = {
	inputIndex: number;
	status: "sent" | "skipped" | "failed";
	to?: string | null;
	providerMessageId?: string | null;
	providerStatus?: string | null;
	errorMessage?: string | null;
};

export type SmsSendBulkResult = {
	sent: number;
	skipped: number;
	failed: number;
	deliveries: SmsDeliveryResult[];
};

type SmsInput = {
	user: UserData;
	message: string;
};

function twilioConfig() {
	const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();
	if (provider && provider !== "twilio") return null;

	const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
	const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
	const messagingServiceSid =
		process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() || null;
	const from = process.env.TWILIO_SMS_FROM?.trim() || null;
	if (!accountSid || !authToken || (!messagingServiceSid && !from)) return null;
	return {
		accountSid,
		authToken,
		messagingServiceSid,
		from,
	};
}

function errorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return "SMS provider rejected the request.";
}

export class SmsService {
	async sendBulk(messages: SmsInput[]): Promise<SmsSendBulkResult> {
		if (!messages.length) {
			return { sent: 0, skipped: 0, failed: 0, deliveries: [] };
		}

		const config = twilioConfig();
		if (!config) {
			logger.warn(
				"SMS notification skipped: configure SMS_PROVIDER=twilio, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and a messaging service or sender number.",
			);
			return {
				sent: 0,
				skipped: messages.length,
				failed: 0,
				deliveries: messages.map((_, inputIndex) => ({
					inputIndex,
					status: "skipped",
					providerStatus: "provider_not_configured",
				})),
			};
		}

		const deliveries: SmsDeliveryResult[] = [];
		for (const [inputIndex, input] of messages.entries()) {
			const to = normalizeCustomerPhoneNumber(input.user.phoneNo);
			if (!to) {
				deliveries.push({
					inputIndex,
					status: "skipped",
					providerStatus: "invalid_phone",
				});
				continue;
			}

			try {
				const body = new URLSearchParams({
					To: to,
					Body: input.message,
					...(config.messagingServiceSid
						? { MessagingServiceSid: config.messagingServiceSid }
						: { From: config.from || "" }),
				});
				const response = await fetch(
					`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
						config.accountSid,
					)}/Messages.json`,
					{
						method: "POST",
						headers: {
							Authorization: `Basic ${Buffer.from(
								`${config.accountSid}:${config.authToken}`,
							).toString("base64")}`,
							"Content-Type": "application/x-www-form-urlencoded",
						},
						body,
					},
				);
				const payload = (await response.json().catch(() => null)) as {
					sid?: string;
					status?: string;
					message?: string;
				} | null;
				if (!response.ok) {
					throw new Error(
						payload?.message || `Twilio SMS error ${response.status}.`,
					);
				}
				deliveries.push({
					inputIndex,
					status: "sent",
					to,
					providerMessageId: payload?.sid || null,
					providerStatus: payload?.status || "accepted",
				});
			} catch (error) {
				deliveries.push({
					inputIndex,
					status: "failed",
					to,
					providerStatus: "provider_rejected",
					errorMessage: errorMessage(error),
				});
			}
		}

		return {
			sent: deliveries.filter((delivery) => delivery.status === "sent").length,
			skipped: deliveries.filter((delivery) => delivery.status === "skipped")
				.length,
			failed: deliveries.filter((delivery) => delivery.status === "failed")
				.length,
			deliveries,
		};
	}
}
