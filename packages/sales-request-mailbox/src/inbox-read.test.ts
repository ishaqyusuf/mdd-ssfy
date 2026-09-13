import { describe, expect, test } from "bun:test";
import {
	DEFAULT_MAILBOX_INBOX_STATUS_COUNTS,
	MAILBOX_INBOX_PAGE_MAX_LIMIT,
	MAILBOX_INBOX_SEARCH_MAX_CHARS,
	authorizeMailboxInboxContentRead,
	authorizeMailboxInboxHealthRead,
	mailboxInboxPageRequestSchema,
	mailboxInboxPageResultSchema,
	projectMailboxAdminHealth,
	projectMailboxInboxDetail,
	projectMailboxInboxPage,
	projectMailboxInboxSummary,
} from "./inbox-read";

const queueIdentity =
	"srq1:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const receivedAt = new Date("2026-09-13T10:00:00.000Z");
const authorizedRead = {
	actorUserId: 7,
	ownerUserId: 7,
	isOrganizationAdmin: false,
	actorActive: true as const,
	authorityCurrent: true as const,
	actorOrganizationId: 10,
	connectionOrganizationId: 10,
	connectionId: "connection-1",
};

function summary(overrides: Record<string, unknown> = {}) {
	return {
		queueIdentity,
		status: "new" as const,
		receivedAt,
		fromEmail: " Customer@Example.com ",
		fromName: "Customer",
		subject: "Door quote",
		hasAttachments: false,
		provider: "gmail",
		providerMessageId: "provider-message-secret",
		providerThreadId: "provider-thread-secret",
		modelInput: "customer prompt should never be returned",
		rawProviderPayload: { access_token: "provider-token-secret" },
		...overrides,
	};
}

describe("sales request mailbox inbox read contracts", () => {
	test("bounds page filters and does not accept client ownership selection", () => {
		expect(
			mailboxInboxPageRequestSchema.parse({
				limit: 20,
				search: "  door quote  ",
				status: "needs-review",
				cursor: "mbx1.opaque-server.cursor-signature",
			}),
		).toEqual({
			limit: 20,
			search: "door quote",
			status: "needs-review",
			cursor: "mbx1.opaque-server.cursor-signature",
		});
		expect(mailboxInboxPageRequestSchema.parse({})).toEqual({ limit: 50 });
		expect(
			mailboxInboxPageRequestSchema.safeParse({
				ownerUserId: 7,
			}).success,
		).toBe(false);
		expect(
			mailboxInboxPageRequestSchema.safeParse({
				limit: MAILBOX_INBOX_PAGE_MAX_LIMIT + 1,
			}).success,
		).toBe(false);
		expect(
			mailboxInboxPageRequestSchema.safeParse({
				search: "x".repeat(MAILBOX_INBOX_SEARCH_MAX_CHARS + 1),
			}).success,
		).toBe(false);
		expect(
			mailboxInboxPageRequestSchema.safeParse({
				cursor: `   mbx1.payload.signature${" ".repeat(3_000)}`,
			}).success,
		).toBe(false);
	});

	test("allows content only to the owning employee", () => {
		expect(
			authorizeMailboxInboxContentRead({
				...authorizedRead,
			}),
		).toEqual({ allowed: true, scope: "owner" });
		expect(
			authorizeMailboxInboxContentRead({
				...authorizedRead,
				actorUserId: 9,
				isOrganizationAdmin: true,
			}),
		).toEqual({ allowed: false, reason: "owner-required" });
		expect(
			authorizeMailboxInboxHealthRead({
				...authorizedRead,
				actorUserId: 9,
				isOrganizationAdmin: true,
			}),
		).toEqual({ allowed: true, scope: "administrator-health" });
	});

	test("fails closed for inactive, stale, malformed, and cross-office authority", () => {
		for (const invalid of [
			{ ...authorizedRead, actorActive: false },
			{ ...authorizedRead, authorityCurrent: false },
			{ ...authorizedRead, actorOrganizationId: 11 },
			{ ...authorizedRead, connectionOrganizationId: 11 },
			{ ...authorizedRead, connectionId: "" },
			{ ...authorizedRead, actorUserId: 0 },
		]) {
			expect(authorizeMailboxInboxContentRead(invalid)).toEqual({
				allowed: false,
				reason: "owner-required",
			});
			expect(authorizeMailboxInboxHealthRead(invalid)).toEqual({
				allowed: false,
				reason: "owner-required",
			});
		}
	});

	test("projects a bounded summary and strips provider internals", () => {
		const projected = projectMailboxInboxSummary(summary());
		expect(projected).toEqual({
			queueIdentity,
			status: "new",
			receivedAt,
			fromEmail: "customer@example.com",
			fromName: "Customer",
			subject: "Door quote",
			hasAttachments: false,
		});
		expect(JSON.stringify(projected)).not.toContain("provider-message-secret");
		expect(JSON.stringify(projected)).not.toContain("provider-token-secret");
		expect(JSON.stringify(projected)).not.toContain("customer prompt");
	});

	test("projects detail from sanitized content without model input or raw payload", () => {
		const projected = projectMailboxInboxDetail({
			...summary(),
			displayText: "Need two solid-core doors.",
			toEmails: ["REP@EXAMPLE.COM", "rep@example.com"],
			ccEmails: ["Estimator@Example.com"],
			htmlBody: "<script>steal()</script>",
			accessToken: "access-token-secret",
		});
		expect(projected).toEqual({
			queueIdentity,
			status: "new",
			receivedAt,
			fromEmail: "customer@example.com",
			fromName: "Customer",
			subject: "Door quote",
			hasAttachments: false,
			displayText: "Need two solid-core doors.",
			toEmails: ["rep@example.com"],
			ccEmails: ["estimator@example.com"],
		});
		expect(JSON.stringify(projected)).not.toContain("access-token-secret");
		expect(JSON.stringify(projected)).not.toContain("steal");
		expect(JSON.stringify(projected)).not.toContain("customer prompt");
	});

	test("returns bounded status counts and opaque pagination only", () => {
		const projected = projectMailboxInboxPage({
			items: [summary()],
			nextCursor: "mbx1.opaque-next.cursor-signature",
			statusCounts: {
				...DEFAULT_MAILBOX_INBOX_STATUS_COUNTS,
				new: 1,
			},
			providerCursor: "provider-cursor-secret",
			rawPayload: { access_token: "provider-token-secret" },
		});
		expect(projected.items).toHaveLength(1);
		expect(projected.nextCursor).toBe("mbx1.opaque-next.cursor-signature");
		expect(projected.statusCounts.new).toBe(1);
		expect(JSON.stringify(projected)).not.toContain("provider-cursor-secret");
		expect(JSON.stringify(projected)).not.toContain("provider-token-secret");
	});

	test("projects admin health with operational metadata only", () => {
		const projected = projectMailboxAdminHealth({
			connectionId: "connection-1",
			ownerUserId: 7,
			provider: "gmail",
			connectionState: "active",
			healthStatus: "temporarily-unavailable",
			lastCheckedAt: receivedAt,
			lastSuccessfulSyncAt: null,
			nextAttemptAt: new Date("2026-09-13T10:05:00.000Z"),
			retryAttempt: 1,
			errorCode: "provider-unavailable",
			accountEmail: "private@example.com",
			accessToken: "provider-token-secret",
			rawError: "raw provider exception",
		});
		expect(projected).toEqual({
			connectionId: "connection-1",
			ownerUserId: 7,
			provider: "gmail",
			connectionState: "active",
			healthStatus: "temporarily-unavailable",
			lastCheckedAt: receivedAt,
			lastSuccessfulSyncAt: null,
			nextAttemptAt: new Date("2026-09-13T10:05:00.000Z"),
			retryAttempt: 1,
			errorCode: "provider-unavailable",
		});
		expect(JSON.stringify(projected)).not.toContain("private@example.com");
		expect(JSON.stringify(projected)).not.toContain("provider-token-secret");
		expect(JSON.stringify(projected)).not.toContain("raw provider exception");
	});

	test("result schema rejects unbounded pages and unknown output fields", () => {
		expect(
			mailboxInboxPageResultSchema.safeParse({
				items: [],
				nextCursor: null,
				statusCounts: DEFAULT_MAILBOX_INBOX_STATUS_COUNTS,
				modelInput: "must not exist",
			}).success,
		).toBe(false);
	});
});
