import type { SalesDocumentDeliveryChannel } from "./sales-document-message";

type ChannelResult = {
	sent: number;
	skipped: number;
	failed?: number;
	deliveries?: Array<{
		providerStatus?: string | null;
	}>;
};

export function resolveDeliveryChannelStatus(result: ChannelResult) {
	if (Number(result.failed || 0) > 0) return "failed" as const;
	if (Number(result.sent || 0) > 0) return "sent" as const;
	return "skipped" as const;
}

export function buildSalesDocumentDeliveryResultTags(input: {
	requestedChannels: SalesDocumentDeliveryChannel[];
	emailAttemptIds: string[];
	emails: ChannelResult;
	whatsapp: ChannelResult;
	sms: ChannelResult;
}) {
	const resultFor = (channel: SalesDocumentDeliveryChannel) =>
		channel === "email"
			? input.emails
			: channel === "whatsapp"
				? input.whatsapp
				: input.sms;
	const statuses = input.requestedChannels.map((channel) => ({
		channel,
		status: resolveDeliveryChannelStatus(resultFor(channel)),
	}));
	const deliveryStatus = statuses.some((entry) => entry.status === "failed")
		? "failed"
		: statuses.every((entry) => entry.status === "sent")
			? "sent"
			: "skipped";

	return {
		...Object.fromEntries(
			statuses.map((entry) => [`${entry.channel}DeliveryStatus`, entry.status]),
		),
		deliveryStatus,
		emailAttemptIds: input.emailAttemptIds,
		whatsAppProviderStatuses: (input.whatsapp.deliveries || [])
			.map((delivery) => delivery.providerStatus)
			.filter(Boolean),
		smsProviderStatuses: (input.sms.deliveries || [])
			.map((delivery) => delivery.providerStatus)
			.filter(Boolean),
	};
}
