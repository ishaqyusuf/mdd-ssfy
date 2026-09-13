import { describe, expect, test } from "bun:test";
import {
	issueMailboxInboxCursor,
	readMailboxInboxCursor,
} from "./inbox-cursor";

const key = new Uint8Array(32).fill(7);
const now = new Date("2026-09-13T12:00:00.000Z");
const keyset = {
	receivedAt: new Date("2026-09-13T11:00:00.000Z"),
	queueIdentity:
		"srq1:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
};
const scope = {
	ownerUserId: 7,
	organizationId: 11,
	connectionId: "connection-1",
	connectionRevision: 4,
	authorityRevision: "authority-4",
	status: "needs-review" as const,
	search: "  Solid Core  ",
};

describe("mailbox Inbox keyset cursor", () => {
	test("round trips only the keyset under the exact normalized scope", () => {
		const cursor = issueMailboxInboxCursor({ key, scope, keyset, now });
		expect(cursor).toMatch(/^mbx1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
		expect(cursor).not.toContain("connection-1");
		expect(cursor).not.toContain("Solid");
		expect(
			readMailboxInboxCursor({
				key,
				scope: { ...scope, search: "Solid Core" },
				cursor,
				now,
			}),
		).toEqual(keyset);
	});

	test("rejects tampering, expiry, the wrong key, and changed authority", () => {
		const cursor = issueMailboxInboxCursor({
			key,
			scope,
			keyset,
			now,
			ttlMs: 1_000,
		});
		const tampered = `${cursor.slice(0, -1)}${cursor.endsWith("a") ? "b" : "a"}`;
		expect(
			readMailboxInboxCursor({ key, scope, cursor: tampered, now }),
		).toBeNull();
		const [prefix, payload, signature] = cursor.split(".");
		const signatureBytes = Buffer.from(signature ?? "", "base64url");
		const alphabet =
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
		const alternateLast = Array.from(alphabet).find((candidate) => {
			if (!signature || candidate === signature.at(-1)) return false;
			return Buffer.from(
				`${signature.slice(0, -1)}${candidate}`,
				"base64url",
			).equals(signatureBytes);
		});
		expect(alternateLast).toBeDefined();
		const nonCanonical = `${prefix}.${payload}.${signature?.slice(0, -1)}${alternateLast}`;
		expect(
			readMailboxInboxCursor({ key, scope, cursor: nonCanonical, now }),
		).toBeNull();
		expect(
			readMailboxInboxCursor({
				key,
				scope,
				cursor,
				now: new Date(now.getTime() + 1_000),
			}),
		).toBeNull();
		expect(
			readMailboxInboxCursor({
				key: new Uint8Array(32).fill(8),
				scope,
				cursor,
				now,
			}),
		).toBeNull();
		expect(
			readMailboxInboxCursor({
				key,
				scope: { ...scope, authorityRevision: "authority-5" },
				cursor,
				now,
			}),
		).toBeNull();
	});

	test("binds owner, office, connection, status, and search", () => {
		const cursor = issueMailboxInboxCursor({ key, scope, keyset, now });
		for (const changed of [
			{ ...scope, ownerUserId: 8 },
			{ ...scope, organizationId: 12 },
			{ ...scope, connectionId: "connection-2" },
			{ ...scope, connectionRevision: 5 },
			{ ...scope, status: "new" as const },
			{ ...scope, search: "hollow core" },
		]) {
			expect(
				readMailboxInboxCursor({ key, scope: changed, cursor, now }),
			).toBeNull();
		}
	});

	test("rejects malformed keys, dates, TTLs, cursors, and queue identities", () => {
		expect(() =>
			issueMailboxInboxCursor({ key: new Uint8Array(31), scope, keyset, now }),
		).toThrow();
		expect(() =>
			issueMailboxInboxCursor({ key, scope, keyset, now, ttlMs: 3_600_001 }),
		).toThrow();
		expect(() =>
			issueMailboxInboxCursor({
				key,
				scope,
				keyset: { ...keyset, queueIdentity: "provider-message-id" },
				now,
			}),
		).toThrow();
		expect(
			readMailboxInboxCursor({ key, scope, cursor: "mbx1.invalid", now }),
		).toBeNull();
	});
});
