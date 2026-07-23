// @ts-expect-error package typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import { composedSalesDocumentEmailSchema } from "../schemas";
import {
	buildComposedSalesDocumentEmailData,
	composedSalesDocumentEmail,
} from "./composed-sales-document-email";

const resolvedData = {
	type: "order" as const,
	customerEmail: "ada@example.com",
	customerPhone: "+13055550100",
	customerName: "Ada",
	salesRep: "Grace",
	salesRepEmail: "grace@gndprodesk.com",
	subject: "Your invoice",
	channels: ["whatsapp", "sms"] as const,
	channelMessage: "Hello Ada,\nView document: https://gnd.test/sh/doc",
	sales: [],
};

describe("composed sales document channel contacts", () => {
	test("keeps legacy composed email payloads email-only by default", () => {
		const parsed = composedSalesDocumentEmailSchema.parse({
			printType: "order",
			salesIds: [42],
			customerEmail: "ada@example.com",
			subject: "Your invoice",
		});
		expect(parsed.channels).toEqual(["email"]);
	});

	test("creates only the explicitly requested direct contacts", () => {
		expect(
			composedSalesDocumentEmail.createDirectEmailContact?.(
				resolvedData as never,
				{} as never,
			),
		).toBeNull();
		expect(
			composedSalesDocumentEmail.createDirectWhatsAppContact?.(
				resolvedData as never,
				{} as never,
			),
		).toMatchObject({
			phoneNo: "+13055550100",
			whatsAppNotification: true,
		});
		expect(
			composedSalesDocumentEmail.createDirectSmsContact?.(
				resolvedData as never,
				{} as never,
			),
		).toMatchObject({
			phoneNo: "+13055550100",
			smsNotification: true,
		});
	});

	test("uses the same compact short-link message for WhatsApp and SMS", () => {
		const whatsapp = composedSalesDocumentEmail.createWhatsApp?.(
			resolvedData as never,
			{} as never,
			{} as never,
		);
		const sms = composedSalesDocumentEmail.createSms?.(
			resolvedData as never,
			{} as never,
			{} as never,
		);
		expect(whatsapp?.message).toBe(resolvedData.channelMessage);
		expect(sms?.message).toBe(resolvedData.channelMessage);
	});

	test("accepts phone-only quote data before enforcing secure links", async () => {
		const createdLinks: Array<Record<string, unknown>> = [];
		const db = {
			salesOrders: {
				findMany: async () => [
					{
						id: 42,
						orderId: "Q-42",
						type: "quote",
						amountDue: 0,
						grandTotal: 1250,
						createdAt: new Date("2026-07-23T12:00:00Z"),
						meta: null,
						customer: {
							id: 7,
							email: null,
							name: "Ada",
							businessName: null,
							phoneNo: "(305) 555-0100",
							walletId: null,
						},
						billingAddress: null,
						salesRep: {
							id: 9,
							email: null,
							name: "Grace",
						},
					},
				],
			},
			shortLink: {
				findFirst: async () => null,
				create: async ({ data }: { data: Record<string, unknown> }) => {
					createdLinks.push(data);
					return {
						...data,
						slug: `link-${createdLinks.length}`,
					};
				},
			},
		};

		await expect(
			buildComposedSalesDocumentEmailData(
				db as never,
				{
					printType: "quote",
					salesIds: [42],
					customerPhone: "(305) 555-0100",
					subject: "Your quote",
					channels: ["whatsapp"],
				},
				{ id: 11, profileId: 11, name: "Sender" },
			),
		).rejects.toThrow(
			"Sales document delivery requires a secure document link.",
		);
		expect(createdLinks).toEqual([]);
	});
});
