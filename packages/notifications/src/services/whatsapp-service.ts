import { createWhatsAppClient } from "@gnd/app-store/whatsapp-client";
import { logger } from "@gnd/logger";
import type { UserData } from "../base";
import { normalizeCustomerPhoneNumber } from "../phone-number";

type WhatsAppInput = {
	user: UserData;
	message: string;
};

export type WhatsAppDeliveryResult = {
	inputIndex: number;
	status: "sent" | "skipped" | "failed";
	to?: string | null;
	providerMessageId?: string | null;
	providerStatus?: string | null;
	errorMessage?: string | null;
};

export class WhatsAppService {
	async sendBulk(messages: WhatsAppInput[]) {
		if (!messages.length) {
			return {
				sent: 0,
				skipped: 0,
				failed: 0,
				deliveries: [] as WhatsAppDeliveryResult[],
			};
		}

		const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
		const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
		if (!phoneNumberId || !accessToken) {
			logger.warn(
				"WhatsApp notification skipped: missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN",
			);
			return {
				sent: 0,
				skipped: messages.length,
				failed: 0,
				deliveries: messages.map((_, inputIndex) => ({
					inputIndex,
					status: "skipped" as const,
					providerStatus: "provider_not_configured",
				})),
			};
		}

		let client: ReturnType<typeof createWhatsAppClient>;
		try {
			client = createWhatsAppClient();
		} catch (error) {
			logger.warn(
				`WhatsApp notification skipped: failed to initialize WhatsApp client (${String(error)})`,
			);
			return {
				sent: 0,
				skipped: messages.length,
				failed: 0,
				deliveries: messages.map((_, inputIndex) => ({
					inputIndex,
					status: "skipped" as const,
					providerStatus: "provider_initialization_failed",
				})),
			};
		}
		const deliveries: WhatsAppDeliveryResult[] = [];

		for (const [inputIndex, input] of messages.entries()) {
			const phone = normalizeCustomerPhoneNumber(input.user.phoneNo);
			if (!phone) {
				deliveries.push({
					inputIndex,
					status: "skipped",
					providerStatus: "invalid_phone",
				});
				continue;
			}

			try {
				const response = (await client.sendMessage(phone, input.message)) as {
					messages?: Array<{ id?: string }>;
				};
				deliveries.push({
					inputIndex,
					status: "sent",
					to: phone,
					providerMessageId: response.messages?.[0]?.id || null,
					providerStatus: "accepted",
				});
			} catch (error) {
				deliveries.push({
					inputIndex,
					status: "failed",
					to: phone,
					providerStatus: "provider_rejected",
					errorMessage:
						error instanceof Error ? error.message : "WhatsApp send failed.",
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
