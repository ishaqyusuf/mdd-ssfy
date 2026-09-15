import { expect, test } from "bun:test";
import type { Database } from "@gnd/db";
import { reportAssistantClientFailure } from "./client-diagnostics";
import { assistantClientDiagnosticSchema } from "./diagnostic-contract";

const actor = { userId: 42, scopeType: "organization", scopeId: "7" };
const input = {
	eventId: "083fb40e-bbbc-4a7d-b37e-9d2f9d3f7398",
	conversationId: "owned-chat",
	stage: "transport" as const,
};

test("client report rejects raw messages, URLs and arbitrary stages", () => {
	expect(assistantClientDiagnosticSchema.safeParse({ eventId: input.eventId, stage: "attachment" }).success).toBe(true);
	expect(assistantClientDiagnosticSchema.safeParse({ eventId: input.eventId, stage: "transport" }).success).toBe(false);
	expect(assistantClientDiagnosticSchema.safeParse({ eventId: input.eventId, stage: "attachment", runId: "forged" }).success).toBe(false);
	for (const extra of [
		{ message: "password=secret" },
		{ url: "https://private" },
		{ stage: "arbitrary" },
	])
		expect(
			assistantClientDiagnosticSchema.safeParse({ ...input, ...extra }).success,
		).toBe(false);
});

test("client capture verifies ownership and reuses occurrence identity on duplicate delivery", async () => {
	let where: unknown;
	const reports: unknown[] = [];
	const db = {
		assistantConversation: {
			findFirst: async (args: { where: unknown }) => {
				where = args.where;
				return { id: input.conversationId };
			},
		},
	} as unknown as Database;
	const deps = {
		command: async <T>() => 1 as T,
		capture: async (_error: unknown, context: { reference?: string }) => {
			reports.push(context);
			return { reference: context.reference!, recorded: true };
		},
	};
	const first = await reportAssistantClientFailure(db, actor, input, deps);
	const second = await reportAssistantClientFailure(db, actor, input, deps);
	expect(first.reference).toBe(second.reference);
	expect(where).toEqual({
		id: "owned-chat",
		ownerUserId: 42,
		scopeType: "organization",
		scopeId: "7",
		deletedAt: null,
	});
	expect(reports[0]).toMatchObject({
		stage: "client",
		operation: "assistant.client.transport",
		outcome: "uncertain",
	});
});

test("rate limits and inaccessible conversations stop diagnostic insertion", async () => {
	let writes = 0;
	const db = {
		assistantConversation: { findFirst: async () => null },
	} as unknown as Database;
	const capture = async () => {
		writes++;
		return { reference: "ERR-ABCDEFGHIJ", recorded: true };
	};
	await expect(
		reportAssistantClientFailure(db, actor, input, {
			command: async <T>() => 6 as T,
			capture,
		}),
	).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
	await expect(
		reportAssistantClientFailure(db, actor, input, {
			command: async <T>() => 1 as T,
			capture,
		}),
	).rejects.toMatchObject({ code: "NOT_FOUND" });
	await expect(
		reportAssistantClientFailure(db, actor, input, {
			command: async () => {
				throw new Error("redis down");
			},
			capture,
		}),
	).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
	expect(writes).toBe(0);
});

test("pre-conversation upload reports record the matching staff outcome", async () => {
	let context: unknown;
	await reportAssistantClientFailure({} as Database, actor, { eventId: input.eventId, stage: "attachment" }, {
		command: async <T>() => 1 as T,
		capture: async (_error, report) => { context = report; return { reference: "ERR-ABCDEFGHIJ", recorded: true }; },
	});
	expect(context).toMatchObject({ operation: "assistant.client.attachment", outcome: "upload-failed", stage: "client" });
	expect(context).not.toHaveProperty("conversationId", "owned-chat");
});
