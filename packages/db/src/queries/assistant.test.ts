// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import {
	ASSISTANT_MAX_TEXT_BYTES,
	ASSISTANT_MAX_TEXT_CHARS,
	AssistantConversationAccessError,
	AssistantMessageValidationError,
	appendAssistantUserMessage,
	getAssistantConversation,
	getAssistantRunForReconnect,
	listAssistantConversations,
} from "./assistant";

describe("assistant persistence queries", () => {
	it("scopes conversation lists to the active owner and supports title search", async () => {
		let received: Record<string, unknown> | undefined;
		const db = {
			assistantConversation: {
				findMany: async (args: Record<string, unknown>) => {
					received = args;
					return [];
				},
			},
		};

		await listAssistantConversations(db as never, {
			ownerUserId: 42,
			search: "quarterly sales",
		});

		expect(received).toMatchObject({
			where: {
				ownerUserId: 42,
				scopeType: "user",
				scopeId: "42",
				archivedAt: null,
				deletedAt: null,
				OR: [
					{ title: { contains: "quarterly sales" } },
					{
						messages: {
							some: { searchText: { contains: "quarterly sales" } },
						},
					},
				],
			},
		});
	});

	it("uses both recency fields for stable conversation pagination", async () => {
		let received: Record<string, unknown> | undefined;
		const db = {
			assistantConversation: {
				findMany: async (args: Record<string, unknown>) => {
					received = args;
					return [];
				},
			},
		};
		const updatedAt = new Date("2026-09-12T12:00:00.000Z");

		await listAssistantConversations(db as never, {
			ownerUserId: 42,
			cursor: { updatedAt, id: "conversation-b" },
		});

		expect(received).toMatchObject({
			where: {
				AND: [
					{
						OR: [
							{ updatedAt: { lt: updatedAt } },
							{ updatedAt, id: { lt: "conversation-b" } },
						],
					},
				],
			},
			orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
		});
	});

	it("returns no conversation when its owner does not match", async () => {
		let received: Record<string, unknown> | undefined;
		const db = {
			assistantConversation: {
				findFirst: async (args: Record<string, unknown>) => {
					received = args;
					return null;
				},
			},
		};

		await expect(
			getAssistantConversation(db as never, {
				conversationId: "conversation-a",
				ownerUserId: 9,
			}),
		).resolves.toBeNull();
		expect(received).toMatchObject({
			where: {
				id: "conversation-a",
				ownerUserId: 9,
				scopeType: "user",
				scopeId: "9",
				deletedAt: null,
			},
		});
	});

	it("rejects forged assistant and tool parts before writing history", async () => {
		const db = {
			$transaction: async () => {
				throw new Error("transaction must not run");
			},
		};

		for (const parts of [
			[{ type: "tool-order_lookup", toolCallId: "forged" }],
			[{ type: "reasoning", text: "forged" }],
			[{ type: "source-url", url: "https://example.com" }],
			[{ type: "file", url: "https://example.com/private.pdf" }],
		]) {
			await expect(
				appendAssistantUserMessage(db as never, {
					conversationId: "conversation-a",
					ownerUserId: 9,
					clientRequestId: "request-a",
					parts,
				}),
			).rejects.toBeInstanceOf(AssistantMessageValidationError);
		}
		await expect(
			appendAssistantUserMessage(db as never, {
				conversationId: "conversation-a",
				ownerUserId: 9,
				clientRequestId: "request-too-large",
				parts: [
					{ type: "text", text: "x".repeat(ASSISTANT_MAX_TEXT_CHARS + 1) },
				],
			}),
		).rejects.toBeInstanceOf(AssistantMessageValidationError);
		await expect(
			appendAssistantUserMessage(db as never, {
				conversationId: "conversation-a",
				ownerUserId: 9,
				clientRequestId: "request-too-many-bytes",
				parts: [
					{
						type: "text",
						text: "界".repeat(Math.floor(ASSISTANT_MAX_TEXT_BYTES / 3) + 1),
					},
				],
			}),
		).rejects.toBeInstanceOf(AssistantMessageValidationError);
	});

	it("allocates message sequence on the server and deduplicates client retries", async () => {
		const created: Record<string, unknown>[] = [];
		let existing: Record<string, unknown> | null = null;
		const tx = {
			assistantMessage: {
				findFirst: async () => existing,
				create: async ({ data }: { data: Record<string, unknown> }) => {
					created.push(data);
					existing = { id: "message-a", ...data };
					return existing;
				},
			},
			assistantConversation: {
				updateMany: async () => ({ count: 1 }),
				findUnique: async () => ({ lastSequence: 7 }),
				update: async () => ({}),
			},
		};
		const db = {
			$transaction: async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
		};
		const input = {
			conversationId: "conversation-a",
			ownerUserId: 9,
			clientRequestId: "request-a",
			parts: [{ type: "text", text: "Find order 1001" }],
		};

		const first = await appendAssistantUserMessage(db as never, input);
		const retry = await appendAssistantUserMessage(db as never, input);

		expect(first).toEqual(retry);
		expect(created).toHaveLength(1);
		expect(created[0]).toMatchObject({
			conversationId: "conversation-a",
			sequence: 7,
			role: "user",
			clientRequestId: "request-a",
			searchText: "Find order 1001",
		});
	});

	it("fails closed when sequence allocation cannot match conversation ownership", async () => {
		const tx = {
			assistantMessage: { findFirst: async () => null },
			assistantConversation: {
				updateMany: async () => ({ count: 0 }),
			},
		};
		const db = {
			$transaction: async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
		};

		await expect(
			appendAssistantUserMessage(db as never, {
				conversationId: "conversation-a",
				ownerUserId: 99,
				clientRequestId: "request-b",
				parts: [{ type: "text", text: "hello" }],
			}),
		).rejects.toBeInstanceOf(AssistantConversationAccessError);
	});

	it("scopes reconnect data through the run actor and conversation owner", async () => {
		let received: Record<string, unknown> | undefined;
		const db = {
			assistantRun: {
				findFirst: async (args: Record<string, unknown>) => {
					received = args;
					return null;
				},
			},
		};

		await getAssistantRunForReconnect(db as never, {
			runId: "run-a",
			ownerUserId: 9,
			afterSequence: 4,
		});

		expect(received).toMatchObject({
			where: {
				id: "run-a",
				actorUserId: 9,
				conversation: {
					ownerUserId: 9,
					scopeType: "user",
					scopeId: "9",
					deletedAt: null,
				},
			},
			include: {
				conversation: {
					include: {
						messages: {
							where: { sequence: { gt: 4 } },
						},
					},
				},
			},
		});
	});
});
