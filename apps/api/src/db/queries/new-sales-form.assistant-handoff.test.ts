import { describe, expect, test } from "bun:test";
import { NEW_SALES_FORM_SEED_EXAMPLE } from "@gnd/sales/sales-form-core";
import { assertAssistantHandoffSaveAuthority } from "./new-sales-form";

const claim = {
	conversationId: "chat-1",
	generationId: "11111111-1111-4111-8111-111111111111",
};
const finalPreview = {
	type: "order", generationId: claim.generationId,
	seed: NEW_SALES_FORM_SEED_EXAMPLE,
	configurationScope: "sales-settings:1", configurationRevision: "revision-1",
	promptVersion: "sales-request-v1", provider: "openai", model: "gpt-5",
	usage: { inputTokens: 1, outputTokens: 1 }, unresolvedCount: 0,
};

function fixture(input: { owned: boolean; consumedSalesId: number | null }) {
	let readRun = false;
	const db = {
		assistantSalesRequestSession: {
			findFirst: async ({ where }: { where: Record<string, unknown> }) => {
				expect(where).toMatchObject({
					conversationId: claim.conversationId,
					generationId: claim.generationId,
					ownerUserId: 42,
					saleType: "order",
					status: "ready",
				});
				return input.owned ? { id: "session-1", finalPreview } : null;
			},
		},
		salesRequestGenerationRun: {
			findFirst: async ({ where }: { where: Record<string, unknown> }) => {
				readRun = true;
				expect(where).toMatchObject({
					generationId: claim.generationId,
					actorUserId: 42,
					status: "succeeded",
				});
				return { consumedSalesId: input.consumedSalesId };
			},
		},
	};
	return { db, didReadRun: () => readRun };
}

describe("Assistant handoff native save authority", () => {
	test("rejects an unowned handoff before reading its generation", async () => {
		const { db, didReadRun } = fixture({ owned: false, consumedSalesId: null });
		await expect(assertAssistantHandoffSaveAuthority(db as never, {
			claim, actorUserId: 42, type: "order", salesId: null,
		})).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
		expect(didReadRun()).toBe(false);
	});

	test("admits an unconsumed draft and the same saved sale, but rejects another", async () => {
		const fresh = fixture({ owned: true, consumedSalesId: null });
		await expect(assertAssistantHandoffSaveAuthority(fresh.db as never, {
			claim, actorUserId: 42, type: "order", salesId: null,
		})).resolves.toMatchObject({ sessionId: "session-1", preview: { generationId: claim.generationId } });
		const consumed = fixture({ owned: true, consumedSalesId: 91 });
		await expect(assertAssistantHandoffSaveAuthority(consumed.db as never, {
			claim, actorUserId: 42, type: "order", salesId: 91,
		})).resolves.toMatchObject({ sessionId: "session-1", preview: { generationId: claim.generationId } });
		await expect(assertAssistantHandoffSaveAuthority(consumed.db as never, {
			claim, actorUserId: 42, type: "order", salesId: null,
		})).rejects.toMatchObject({ code: "CONFLICT" });
	});
});
