import { describe, expect, test } from "bun:test";
import {
	ASSISTANT_CONVERSATION_RETENTION_BATCH_SIZE,
	runAssistantConversationRetention,
} from "./conversation-retention";

describe("assistant conversation retention", () => {
	test("deletes backing blobs before purging due conversation rows", async () => {
		const calls: string[] = [];
		const result = await runAssistantConversationRetention(
			{
				listDue: async () => [{ id: "conversation-1" }],
				listDocuments: async () => [
					{
						id: "document-1",
						provider: "vercel-blob",
						pathname: "assistant/one.pdf",
					},
					{
						id: "document-2",
						provider: "vercel-blob",
						pathname: "assistant/one.pdf",
					},
				],
				isPathShared: async () => false,
				deleteBlob: async (pathname) => {
					calls.push(`blob:${pathname}`);
				},
				purge: async ({ conversationId }) => {
					calls.push(`rows:${conversationId}`);
					return { purged: true };
				},
			},
			new Date("2026-09-17T12:00:00.000Z"),
		);

		expect(calls).toEqual([
			"blob:assistant/one.pdf",
			"rows:conversation-1",
		]);
			expect(result).toEqual({
				scanned: 1,
				purged: 1,
				blobsDeleted: 1,
				sharedBlobsPreserved: 0,
				failed: 0,
			moreMayRemain: false,
		});
	});

	test("keeps database rows when blob deletion fails so the job can retry", async () => {
		let purgeCalls = 0;
		const errors: Array<Record<string, unknown>> = [];
		const result = await runAssistantConversationRetention({
			listDue: async () => [{ id: "conversation-1" }],
			listDocuments: async () => [
				{
					id: "document-1",
					provider: "vercel-blob",
					pathname: "assistant/one.pdf",
				},
			],
			isPathShared: async () => false,
			deleteBlob: async () => {
				throw new Error("temporary provider failure");
			},
			purge: async () => {
				purgeCalls += 1;
				return { purged: true };
			},
			logError: (_message, attributes) => errors.push(attributes),
		});

		expect(purgeCalls).toBe(0);
		expect(result.failed).toBe(1);
		expect(errors).toEqual([
			{
				conversationId: "conversation-1",
				error: "temporary provider failure",
			},
		]);
	});

	test("reports when another bounded batch may remain", async () => {
		const result = await runAssistantConversationRetention({
			listDue: async () =>
				Array.from(
					{ length: ASSISTANT_CONVERSATION_RETENTION_BATCH_SIZE },
					(_, index) => ({ id: `conversation-${index}` }),
				),
			listDocuments: async () => [],
			isPathShared: async () => false,
			deleteBlob: async () => undefined,
			purge: async () => ({ purged: true }),
		});

		expect(result.moreMayRemain).toBe(true);
		expect(result.purged).toBe(ASSISTANT_CONVERSATION_RETENTION_BATCH_SIZE);
	});

	test("fails unsupported providers and preserves shared blobs while purging metadata", async () => {
		let purgeCalls = 0;
		const providers = ["future-provider", "vercel-blob"];
		const result = await runAssistantConversationRetention({
			listDue: async () =>
				providers.map((_, index) => ({ id: `conversation-${index}` })),
			listDocuments: async ({ conversationId }) => {
				const index = Number(conversationId.split("-").at(-1));
				return [
					{
						id: `document-${index}`,
						provider: providers[index] ?? "",
						pathname: `assistant/${index}.pdf`,
					},
				];
			},
			isPathShared: async ({ provider }) => provider === "vercel-blob",
			deleteBlob: async () => undefined,
			purge: async () => {
				purgeCalls += 1;
				return { purged: true };
			},
		});

		expect(result.failed).toBe(1);
		expect(result.sharedBlobsPreserved).toBe(1);
		expect(purgeCalls).toBe(1);
	});
});
