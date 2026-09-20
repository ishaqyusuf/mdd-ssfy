import { describe, expect, test } from "bun:test";
import type { Database } from "@gnd/db";
import { NEW_SALES_FORM_SEED_EXAMPLE } from "@gnd/sales/sales-form-core";
import { getAssistantSalesDraftHandoff } from "./sales-draft-handoff";

const actor = { userId: 42, scopeType: "user", scopeId: "42" };
const input = { conversationId: "another-chat", generationId: "generation-1" };

describe("Assistant Sales draft handoff", () => {
	test("does not read a draft when the current actor does not own the conversation", async () => {
		let readDraft = false;
		const db = {
			assistantConversation: {
				findFirst: async ({ where }: { where: Record<string, unknown> }) => {
					expect(where).toEqual({
						id: input.conversationId,
						ownerUserId: actor.userId,
						scopeType: actor.scopeType,
						scopeId: actor.scopeId,
						deletedAt: null,
					});
					return null;
				},
			},
			assistantSalesRequestSession: {
				findFirst: async () => {
					readDraft = true;
				},
			},
		};
		await expect(
			getAssistantSalesDraftHandoff(db as unknown as Database, actor, input),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(readDraft).toBe(false);
	});

	test("an expired preview cannot open through its stored conversation", async () => {
		const now = new Date("2026-09-19T12:00:00Z");
		const db = {
			assistantConversation: {
				findFirst: async () => ({ id: input.conversationId }),
			},
			assistantSalesRequestSession: {
				findFirst: async () => ({
					finalPreview: {},
					completedAt: new Date("2026-09-19T11:44:59Z"),
					saleType: "order",
				}),
			},
			salesRequestGenerationRun: { findFirst: async () => null },
			assistantMessage: {
				findMany: async () => [
					{
						createdAt: new Date("2026-09-19T11:44:59Z"),
						parts: [{ type: "data-assistant-order-draft", data: {} }],
					},
				],
			},
		};
		await expect(
			getAssistantSalesDraftHandoff(
				db as unknown as Database,
				actor,
				input,
				now,
			),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	test("an owned saved request returns its existing sale instead of another draft", async () => {
		const db = {
			assistantConversation: { findFirst: async () => ({ id: input.conversationId }) },
			assistantSalesRequestSession: { findFirst: async () => ({
				finalPreview: {},
				completedAt: new Date("2026-09-19T11:00:00Z"),
				saleType: "order",
			}) },
			salesRequestGenerationRun: { findFirst: async () => ({ consumedSalesId: 91 }) },
			salesOrders: { findFirst: async ({ where }: { where: Record<string, unknown> }) => {
				expect(where).toMatchObject({ id: 91, type: "order", deletedAt: null });
				return { orderId: "QA91", slug: "QA91" };
			} },
		};
		expect(await getAssistantSalesDraftHandoff(
			db as unknown as Database, actor, input, new Date("2026-09-19T12:00:00Z"),
		)).toEqual({ preview: null, savedSale: { orderId: "QA91", slug: "QA91" } });
	});

	test("the chat-owned saved receipt survives generation telemetry cleanup", async () => {
		const db = {
			assistantConversation: { findFirst: async () => ({ id: input.conversationId }) },
			assistantSalesRequestSession: { findFirst: async () => ({
				finalPreview: {
					type: "order", generationId: "11111111-1111-4111-8111-111111111111",
					seed: NEW_SALES_FORM_SEED_EXAMPLE,
					configurationScope: "sales-settings:1", configurationRevision: "revision-1",
					promptVersion: "sales-request-v1", provider: "openai", model: "gpt-5",
					usage: { inputTokens: 1, outputTokens: 1 }, unresolvedCount: 0,
					savedSale: { orderId: "QA91", slug: "QA91" },
				},
				completedAt: new Date("2026-09-19T11:00:00Z"), saleType: "order",
			}) },
			salesOrders: { findFirst: async () => ({ orderId: "QA91", slug: "QA91" }) },
		};
		expect(await getAssistantSalesDraftHandoff(
			db as unknown as Database, actor,
			{ ...input, generationId: "11111111-1111-4111-8111-111111111111" },
			new Date("2026-09-19T12:00:00Z"),
		)).toEqual({ preview: null, savedSale: { orderId: "QA91", slug: "QA91" } });
	});
});
