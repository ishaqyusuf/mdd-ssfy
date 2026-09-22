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

	test("a completed final preview is projected for native handoff without changing stored source facts", async () => {
		const now = new Date("2026-09-19T12:00:00Z");
		const sourceText = [
			"Left Side", "1 ATTIC ACCESS", "DOORS", '30” = AC CLOSET LUVER BIFOLD',
			"Right Side", "1 ATTIC ACCESS", "DOORS", '30” = AC CLOSET LUVER BIFOLD',
		].join("\n");
		const configurationJson = JSON.stringify({
			routes: [
				{ itemTypeUid: "prehung", rootStepId: 1, stepUids: ["door"] },
				{ itemTypeUid: "mouldings", rootStepId: 1, stepUids: ["moulding-products"] },
			],
			steps: [
				{ id: 1, uid: "item-type", title: "Item Type", components: [
					["prehung", "Prehung"], ["mouldings", "Mouldings"],
				] },
				{ id: 2, uid: "door", title: "Door", components: [] },
				{ id: 3, uid: "moulding-products", title: "Mouldings", components: [] },
			],
			visibilityByComponentUid: {},
		});
		const finalPreview = {
			type: "order" as const,
			generationId: "11111111-1111-4111-8111-111111111111",
			seed: {
				schemaVersion: 2 as const,
				lineItems: [
					{ uid: "door-schedule", qty: 2,
						formSteps: [{ stepId: 1, prodUid: "prehung" }] },
					{ uid: "attic-access-left", qty: 1,
						formSteps: [{ stepId: 1, prodUid: "mouldings" }] },
					{ uid: "attic-access-right", qty: 1,
						formSteps: [{ stepId: 1, prodUid: "mouldings" }] },
				],
				unresolved: [],
			},
			configurationScope: "sales-settings:1",
			configurationRevision: "revision-1",
			promptVersion: "sales-request-v1",
			provider: "openai",
			model: "gpt-5",
			usage: { inputTokens: 1, outputTokens: 1 },
			unresolvedCount: 0,
		};
		const db = {
			assistantConversation: { findFirst: async () => ({ id: input.conversationId }) },
			assistantSalesRequestSession: { findFirst: async () => ({
				finalPreview, sourceText, completedAt: new Date("2026-09-19T11:59:00Z"),
				saleType: "order",
			}) },
			salesRequestGenerationRun: { findFirst: async () => null },
			settings: { findMany: async () => [{ id: 1 }] },
		};
		const result = await getAssistantSalesDraftHandoff(
			db as unknown as Database,
			actor,
			{ ...input, generationId: finalPreview.generationId },
			now,
			{
				authorizeSalesRequestPreview: async () => {},
				getAssistantRuntimeConfiguration: async () => ({
					selection: { provider: "openai" as const, model: "gpt-5" },
					source: "persisted" as const, version: 1, updatedAt: null,
					updatedByUserId: null,
				}),
				getSalesRequestConfigurationContext: async () => ({
					scope: "sales-settings:1", revision: "revision-1", configurationJson,
				}) as never,
				getSalesRequestCatalogSettings: async () => ({ publication: {} }) as never,
				isSalesRequestCatalogPublicationCurrent: () => true,
			},
		);

		expect(result.preview?.seed.lineItems).toEqual([]);
		expect(result.preview?.unresolvedCount).toBe(4);
		expect(result.preview?.seed.unresolved.map((item) => item.reason)).toEqual([
			expect.stringContaining("Left Side door row 1"),
			expect.stringContaining("Right Side door row 1"),
			expect.stringContaining("Left Side: 1 ATTIC ACCESS"),
			expect.stringContaining("Right Side: 1 ATTIC ACCESS"),
		]);
		expect(finalPreview.seed.lineItems).toHaveLength(3);
		expect(finalPreview.seed.unresolved).toEqual([]);
	});
});
