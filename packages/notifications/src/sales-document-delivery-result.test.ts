// @ts-expect-error package typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import { buildSalesDocumentDeliveryResultTags } from "./sales-document-delivery-result";

describe("sales document delivery result tags", () => {
	test("records each requested channel and a partial outcome", () => {
		expect(
			buildSalesDocumentDeliveryResultTags({
				requestedChannels: ["email", "whatsapp"],
				emailAttemptIds: ["attempt-1"],
				emails: { sent: 1, skipped: 0, failed: 0 },
				whatsapp: {
					sent: 0,
					skipped: 1,
					failed: 0,
					deliveries: [{ providerStatus: "provider_not_configured" }],
				},
				sms: { sent: 0, skipped: 0, failed: 0 },
			}),
		).toEqual({
			emailDeliveryStatus: "sent",
			whatsappDeliveryStatus: "skipped",
			deliveryStatus: "skipped",
			emailAttemptIds: ["attempt-1"],
			whatsAppProviderStatuses: ["provider_not_configured"],
			smsProviderStatuses: [],
		});
	});

	test("makes any requested provider failure the overall failure", () => {
		const tags = buildSalesDocumentDeliveryResultTags({
			requestedChannels: ["sms"],
			emailAttemptIds: [],
			emails: { sent: 0, skipped: 0, failed: 0 },
			whatsapp: { sent: 0, skipped: 0, failed: 0 },
			sms: { sent: 0, skipped: 0, failed: 1 },
		});
		expect(tags.deliveryStatus).toBe("failed");
		expect((tags as Record<string, unknown>).smsDeliveryStatus).toBe("failed");
	});
});
