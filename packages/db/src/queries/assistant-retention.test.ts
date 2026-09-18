// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import {
	assistantConversationRetentionUntil,
	createAssistantConversation,
	getAssistantConversationRetentionPolicy,
	listAssistantConversationDocumentsForRetention,
	listAssistantConversationsDueForRetention,
	purgeAssistantConversationDueForRetention,
	softDeleteAssistantConversation,
} from "./assistant";

describe("assistant conversation retention", () => {
	test("requires an explicit bounded retention policy", () => {
		const deletedAt = new Date("2026-09-17T12:00:00.000Z");
		expect(assistantConversationRetentionUntil(deletedAt, {})).toBeNull();
		expect(
			assistantConversationRetentionUntil(deletedAt, {
				ASSISTANT_CONVERSATION_RETENTION_DAYS: "7",
			})?.getTime(),
		).toBe(deletedAt.getTime() + 7 * 24 * 60 * 60 * 1_000);
		expect(
			assistantConversationRetentionUntil(deletedAt, {
				ASSISTANT_CONVERSATION_RETENTION_DAYS: "0",
			}),
		).toBeNull();
		expect(
			assistantConversationRetentionUntil(deletedAt, {
				ASSISTANT_CONVERSATION_RETENTION_DAYS: "7days",
			}),
		).toBeNull();
		expect(
			assistantConversationRetentionUntil(deletedAt, {
				ASSISTANT_CONVERSATION_RETENTION_DAYS: "7.5",
			}),
		).toBeNull();
		expect(
			getAssistantConversationRetentionPolicy({
				ASSISTANT_CONVERSATION_RETENTION_DAYS: " 7 ",
			}),
		).toEqual({ configured: true, days: 7 });
	});

	test("does not invent a conversation retention duration", async () => {
		let createInput: Record<string, unknown> | undefined;
		const database = {
			assistantConversation: {
				create: async (input: Record<string, unknown>) => {
					createInput = input;
					return input;
				},
			},
		};

		await createAssistantConversation(database as never, {
			ownerUserId: 42,
			title: "Retained conversation",
		});

		const data = createInput?.data as { retentionUntil: Date | null };
		expect(data.retentionUntil).toBeNull();
	});

	test("revokes conversation and document access on soft delete", async () => {
		const conversationUpdates: Array<Record<string, unknown>> = [];
		const documentUpdates: Array<Record<string, unknown>> = [];
		const tx = {
			assistantConversation: {
				updateMany: async (input: Record<string, unknown>) => {
					conversationUpdates.push(input);
					return { count: 1 };
				},
			},
			storedDocument: {
				updateMany: async (input: Record<string, unknown>) => {
					documentUpdates.push(input);
					return { count: 1 };
				},
			},
		};
		const database = {
			$transaction: async (
				operation: (client: typeof tx) => Promise<unknown>,
			) => operation(tx),
		};

		await softDeleteAssistantConversation(database as never, {
			conversationId: "conversation-1",
			ownerUserId: 42,
		});

		expect(conversationUpdates[0]).toMatchObject({
			where: { id: "conversation-1", ownerUserId: 42, deletedAt: null },
		});
		expect(documentUpdates[0]).toMatchObject({
			data: { isCurrent: false },
		});
	});

	test("reads tombstoned document paths only after rechecking the due conversation", async () => {
		let documentQuery: Record<string, unknown> | undefined;
		const database = {
			assistantConversation: {
				findFirst: async () => ({ id: "conversation-1" }),
			},
			storedDocument: {
				findMany: async (input: Record<string, unknown>) => {
					documentQuery = input;
					return [];
				},
			},
		};

		await listAssistantConversationDocumentsForRetention(database as never, {
			conversationId: "conversation-1",
			before: new Date("2026-09-17T12:00:00.000Z"),
		});

		expect(documentQuery).toMatchObject({
			where: {
				ownerType: "assistant_conversation",
				ownerId: "conversation-1",
			},
		});
		expect(
			Object.hasOwn(
				(documentQuery?.where ?? {}) as Record<string, unknown>,
				"deletedAt",
			),
		).toBe(true);
	});

	test("does not offer conversations with active runs for retention", async () => {
		let query: Record<string, unknown> | undefined;
		const database = {
			assistantConversation: {
				findMany: async (input: Record<string, unknown>) => {
					query = input;
					return [];
				},
			},
		};

		await listAssistantConversationsDueForRetention(database as never, {
			before: new Date("2026-09-17T12:00:00.000Z"),
		});

		expect(query).toMatchObject({
			where: {
				deletedAt: { not: null },
				runs: {
					none: {
						status: { notIn: ["succeeded", "failed", "cancelled"] },
					},
				},
			},
		});
	});

	test("purges dependent rows in relation-safe order and retains detached feature requests", async () => {
		const calls: string[] = [];
		const model = (name: string, result: unknown = { count: 1 }) => ({
			deleteMany: async () => {
				calls.push(`delete:${name}`);
				return result;
			},
		});
		const tx = {
			assistantConversation: {
				findFirst: async () => ({ id: "conversation-1" }),
				deleteMany: async () => {
					calls.push("delete:conversation");
					return { count: 1 };
				},
			},
			assistantRun: {
				findMany: async () => [{ id: "run-1" }],
				...model("runs"),
			},
			assistantUsageEvent: {
				findMany: async () => [{ id: "usage-1" }],
				...model("usage-events"),
			},
			assistantFeatureRequest: {
				updateMany: async () => {
					calls.push("detach:feature-requests");
					return { count: 1 };
				},
			},
			assistantUsageReconciliation: model("usage-reconciliations"),
			assistantActionProposal: model("proposals"),
			assistantToolExecution: model("tool-executions"),
			assistantQuotaReservation: model("quota-reservations"),
			assistantMessage: {
				updateMany: async () => {
					calls.push("unlink:messages");
					return { count: 1 };
				},
				...model("messages"),
			},
			storedDocument: model("documents", { count: 2 }),
		};
		const database = {
			$transaction: async (
				operation: (client: typeof tx) => Promise<unknown>,
			) => operation(tx),
		};

		const result = await purgeAssistantConversationDueForRetention(
			database as never,
			{
				conversationId: "conversation-1",
				before: new Date("2026-09-17T12:00:00.000Z"),
			},
		);

		expect(result).toEqual({
			purged: true,
			documentCount: 2,
			runCount: 1,
			usageEventCount: 1,
		});
		expect(calls).toEqual([
			"detach:feature-requests",
			"delete:usage-reconciliations",
			"delete:usage-events",
			"delete:proposals",
			"delete:tool-executions",
			"delete:quota-reservations",
			"delete:runs",
			"unlink:messages",
			"delete:messages",
			"delete:documents",
			"delete:conversation",
		]);
	});
});
