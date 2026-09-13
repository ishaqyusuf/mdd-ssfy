import { describe, expect, test } from "bun:test";
import { buildMailboxQueueIdentity } from "@gnd/sales-request-mailbox";
import {
	createPrismaSalesRequestMailboxInboxReader,
	createPrismaSalesRequestMailboxJobWorkStore,
} from "./sales-request-mailbox-content";
import {
	hashMailboxProviderMessageIdentity,
	hashMailboxProviderSourceIdentity,
	hashMailboxSourceKey,
} from "./sales-request-mailbox-identities";

const CURSOR_KEY = new Uint8Array(32).fill(7);

function inboxDatabase() {
	const calls: Array<{ method: string; args: unknown }> = [];
	const connection = {
		id: "connection-1",
		organizationId: 40,
		ownerUserId: 9,
		revision: 3,
		policyRevision: 3,
		authorityRevision: "authority-3",
		provider: "gmail",
		state: "active",
		syncBlocked: false,
	};
	const queueRows = [
		{
			queueIdentity: `srq1:${"a".repeat(64)}`,
			status: "new",
			receivedAt: new Date("2026-09-13T09:00:00.000Z"),
			fromEmail: "first@example.com",
			fromName: "First",
			subject: "First order",
			hasAttachments: false,
		},
		{
			queueIdentity: `srq1:${"9".repeat(64)}`,
			status: "needs-review",
			receivedAt: new Date("2026-09-13T08:00:00.000Z"),
			fromEmail: "second@example.com",
			fromName: null,
			subject: "Second order",
			hasAttachments: false,
		},
	];
	const db = {
		$transaction: async (callback: (value: unknown) => unknown) => callback(db),
		salesRequestMailboxConnection: {
			findFirst: async (args: unknown) => {
				calls.push({ method: "connection.findFirst", args });
				return connection;
			},
		},
		salesRequestMailboxQueueProjection: {
			findMany: async (args: unknown) => {
				calls.push({ method: "queue.findMany", args });
				return queueRows;
			},
			groupBy: async (args: unknown) => {
				calls.push({ method: "queue.groupBy", args });
				return [
					{ status: "new", _count: { _all: 1 } },
					{ status: "needs-review", _count: { _all: 1 } },
				];
			},
		},
	};
	return { db, calls };
}

describe("Prisma sales-request mailbox Inbox reader", () => {
	test("returns an owner-private bounded keyset page and status counts", async () => {
		const { db, calls } = inboxDatabase();
		const reader = createPrismaSalesRequestMailboxInboxReader(
			db as never,
			CURSOR_KEY,
			{
				resolveAuthority: async () => ({
					current: true,
					ownerActive: true,
					policy: {
						enabled: true,
						supportedProviders: ["gmail"],
						eligibleUserIds: [9],
						retentionDays: 30,
						maximumAutomationMode: "manual",
						emergencyDisabled: false,
						allowAttachments: false,
						maxAttachmentBytes: 0,
						revision: 3,
						changedAt: null,
					},
				}),
			},
		);

		const page = await reader.list({
			actorUserId: 9,
			organizationId: 40,
			connectionId: "connection-1",
			request: { limit: 1 },
			now: new Date("2026-09-13T10:00:00.000Z"),
		});

		expect(page.items).toHaveLength(1);
		expect(page.items[0]?.queueIdentity).toBe(`srq1:${"a".repeat(64)}`);
		expect(page.nextCursor).toMatch(/^mbx1\./);
		expect(page.statusCounts.new).toBe(1);
		expect(page.statusCounts["needs-review"]).toBe(1);
		const listArgs = calls.find((call) => call.method === "queue.findMany")
			?.args as { where: Record<string, unknown>; take: number };
		expect(listArgs.take).toBe(2);
		expect(listArgs.where).toMatchObject({
			ownerUserId: 9,
			organizationId: 40,
			connectionId: "connection-1",
			withdrawnAt: null,
		});
	});

	test("does not reveal whether another owner's connection exists", async () => {
		const { db } = inboxDatabase();
		const reader = createPrismaSalesRequestMailboxInboxReader(
			db as never,
			CURSOR_KEY,
			{
				resolveAuthority: async () => {
					throw new Error("must-not-authorize-other-owner");
				},
			},
		);
		await expect(
			reader.list({
				actorUserId: 10,
				organizationId: 40,
				connectionId: "connection-1",
				request: {},
				now: new Date("2026-09-13T10:00:00.000Z"),
			}),
		).rejects.toThrow("mailbox-inbox-unavailable");
	});
});

describe("Prisma sales-request mailbox durable work resolver", () => {
	test("resolves detail work from a summary ID and verifies the exact raw message identity", async () => {
		const providerMessageId = "Case/Sensitive-Message-ID";
		const summary = {
			id: "summary-1",
			connectionId: "connection-1",
			sourceId: "source-1",
			provider: "gmail",
			providerMessageId,
			providerMessageIdentityHash: hashMailboxProviderMessageIdentity(
				"gmail",
				providerMessageId,
			),
			summaryRevision: 4,
			active: true,
			detailStatus: "queued",
			disposition: "accepted",
		};
		const db = {
			salesRequestMailboxMessageSummary: {
				findUnique: async () => summary,
			},
			salesRequestMailboxSource: {
				findUnique: async () => ({
					id: "source-1",
					connectionId: "connection-1",
					kind: "gmail-label",
					providerSourceId: "INBOX",
					providerSourceIdentityHash: hashMailboxProviderSourceIdentity(
						"gmail-label",
						"INBOX",
					),
					sourceKey: "gmail:label:INBOX",
					sourceKeyIdentityHash: hashMailboxSourceKey("gmail:label:INBOX"),
					selected: true,
				}),
			},
			salesRequestMailboxConnection: {
				findUnique: async () => ({ id: "connection-1", provider: "gmail" }),
			},
		};
		const store = createPrismaSalesRequestMailboxJobWorkStore(db as never);

		expect(
			await store.resolveMessageDetailWork({ workId: "summary-1" }),
		).toEqual({
			kind: "ready",
			work: {
				connectionId: "connection-1",
				source: {
					kind: "gmail-label",
					labelId: "INBOX",
					key: "gmail:label:INBOX",
				},
				providerMessageId,
				expectedSummaryRevision: 4,
			},
		});
	});

	test("rejects a hash collision candidate whose retained raw ID differs", async () => {
		const db = {
			salesRequestMailboxMessageSummary: {
				findUnique: async () => ({
					id: "summary-1",
					connectionId: "connection-1",
					sourceId: "source-1",
					provider: "gmail",
					providerMessageId: "different-case",
					providerMessageIdentityHash: hashMailboxProviderMessageIdentity(
						"gmail",
						"Different-Case",
					),
					summaryRevision: 4,
					active: true,
					detailStatus: "queued",
					disposition: "accepted",
				}),
			},
			salesRequestMailboxSource: { findUnique: async () => null },
		};
		const store = createPrismaSalesRequestMailboxJobWorkStore(db as never);
		expect(
			await store.resolveMessageDetailWork({ workId: "summary-1" }),
		).toEqual({ kind: "not-found" });
	});
});
