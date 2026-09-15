import { expect, test } from "bun:test";
import type { Database } from "../index";
import {
	getAssistantDiagnostic,
	listAssistantDiagnostics,
	recordAssistantDiagnostic,
	reviewAssistantDiagnostic,
} from "./assistant-diagnostics";

test("diagnostic reads and reviews authorize before touching incident records", async () => {
	let touched = false;
	const db = {
		users: { findFirst: async () => null },
		assistantDiagnostic: {
			findMany: async () => {
				touched = true;
				return [];
			},
			findFirst: async () => {
				touched = true;
				return null;
			},
		},
		$transaction: async () => {
			touched = true;
		},
	} as unknown as Database;
	await expect(listAssistantDiagnostics(db, 12, {})).rejects.toThrow(
		"access denied",
	);
	await expect(
		getAssistantDiagnostic(db, 12, "ERR-ABCDEFGHIJ"),
	).rejects.toThrow("access denied");
	await expect(
		reviewAssistantDiagnostic(db, 12, {
			reference: "ERR-ABCDEFGHIJ",
			status: "resolved",
			note: "",
		}),
	).rejects.toThrow("access denied");
	expect(touched).toBe(false);
});

test("admin diagnostics do not grant another user's conversation access", async () => {
	let conversationWhere: unknown;
	const db = {
		users: { findFirst: async () => ({ id: 12 }) },
		assistantDiagnostic: {
			findFirst: async () => ({
				reference: "ERR-ABCDEFGHIJ",
				conversationId: "other-chat",
				scopeType: "organization",
				scopeId: "7",
				runId: null,
				reviews: [],
			}),
		},
		assistantConversation: {
			findFirst: async (args: { where: unknown }) => {
				conversationWhere = args.where;
				return null;
			},
		},
	} as unknown as Database;
	const result = await getAssistantDiagnostic(db, 12, "ERR-ABCDEFGHIJ");
	expect(conversationWhere).toEqual({
		id: "other-chat",
		ownerUserId: 12,
		scopeType: "organization",
		scopeId: "7",
		deletedAt: null,
	});
	expect(result?.conversation).toBeNull();
});

test("duplicate occurrence delivery cannot replace immutable evidence or review state", async () => {
	let received: unknown;
	const db = {
		assistantDiagnostic: {
			upsert: async (args: unknown) => {
				received = args;
				return { reference: "ERR-ABCDEFGHIJ" };
			},
		},
	} as unknown as Database;
	const evidence = {
		reference: "ERR-ABCDEFGHIJ",
		fingerprint: "a".repeat(64),
		stage: "provider",
		operation: "assistant.chat",
		code: "INTERNAL_ERROR",
		severity: "error",
		outcome: "temporary",
		publicMessage: "Please try again.",
		details: {},
		expiresAt: new Date(),
	};
	await recordAssistantDiagnostic(db, evidence);
	expect(received).toEqual({
		where: { reference: evidence.reference },
		create: evidence,
		update: {},
		select: { reference: true },
	});
});

test("review status and audit entry are committed in one serializable transaction", async () => {
	const writes: unknown[] = [];
	let isolation: unknown;
	const tx = {
		assistantDiagnostic: {
			findFirst: async () => ({ status: "new" }),
			update: async (args: unknown) => {
				writes.push(args);
			},
		},
		assistantDiagnosticReview: {
			create: async (args: unknown) => {
				writes.push(args);
			},
		},
	};
	const db = {
		users: { findFirst: async () => ({ id: 12 }) },
		$transaction: async (
			run: (client: unknown) => Promise<unknown>,
			options: unknown,
		) => {
			isolation = options;
			return run(tx);
		},
	} as unknown as Database;
	await reviewAssistantDiagnostic(db, 12, {
		reference: "ERR-ABCDEFGHIJ",
		status: "investigating",
		note: "Checking provider response",
	});
	expect(isolation).toEqual({ isolationLevel: "Serializable" });
	expect(writes).toEqual([
		{
			where: { reference: "ERR-ABCDEFGHIJ" },
			data: { status: "investigating" },
		},
		{
			data: {
				reference: "ERR-ABCDEFGHIJ",
				reviewerId: 12,
				fromStatus: "new",
				status: "investigating",
				note: "Checking provider response",
			},
		},
	]);
});
