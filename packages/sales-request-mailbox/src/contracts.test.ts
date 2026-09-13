import { describe, expect, test } from "bun:test";
import {
	DEFAULT_SALES_REQUEST_MAILBOX_POLICY,
	applyMailboxExclusions,
	buildMailboxQueueIdentity,
	mailboxAutomationHeadersSchema,
	mailboxConnectionConfigurationSchema,
	mailboxConnectionPreferencesInputSchema,
	normalizeMailboxPolicy,
	resolveMailboxAccess,
	resolveMailboxAutomationMode,
} from "./contracts";

describe("sales request mailbox contracts", () => {
	test("defaults the organization policy to fully disabled", () => {
		expect(DEFAULT_SALES_REQUEST_MAILBOX_POLICY).toMatchObject({
			enabled: false,
			supportedProviders: [],
			eligibleUserIds: [],
			maximumAutomationMode: "manual",
			emergencyDisabled: true,
		});
	});

	test("normalizes bounded lists and provider aliases deterministically", () => {
		expect(
			normalizeMailboxPolicy({
				enabled: true,
				supportedProviders: ["microsoft-graph", "gmail", "gmail"],
				eligibleUserIds: [9, 3, 9],
				retentionDays: 30,
				maximumAutomationMode: "classify",
				emergencyDisabled: false,
				allowAttachments: false,
				maxAttachmentBytes: 0,
			}),
		).toMatchObject({
			supportedProviders: ["gmail", "microsoft-graph"],
			eligibleUserIds: [3, 9],
		});
	});

	test("never permits a connection mode above organization policy", () => {
		expect(resolveMailboxAutomationMode("generate", "classify")).toBe(
			"classify",
		);
		expect(resolveMailboxAutomationMode("manual", "generate")).toBe("manual");
	});

	test("requires normalized owner-scoped connection preferences", () => {
		const result = mailboxConnectionConfigurationSchema.parse({
			organizationId: 2,
			ownerUserId: 7,
			provider: "gmail",
			providerAccountId: "acct-1",
			accountEmail: " ORDERS@EXAMPLE.COM ",
			folderIds: ["INBOX"],
			labelIds: ["sales", "sales"],
			excludedSenders: ["NO-REPLY@EXAMPLE.COM"],
			excludedDomains: ["example.invalid"],
			automationMode: "manual",
			notifyOnNeedsReview: true,
		});
		expect(result.accountEmail).toBe("orders@example.com");
		expect(result.labelIds).toEqual(["sales"]);
		expect(result.excludedSenders).toEqual(["no-reply@example.com"]);
		expect(
			mailboxConnectionPreferencesInputSchema.safeParse({
				folderIds: [],
				labelIds: [],
				excludedSenders: [],
				excludedDomains: [],
				automationMode: "manual",
				notifyOnNeedsReview: true,
				ownerUserId: 99,
			}),
		).toMatchObject({ success: false });
	});

	test("excludes folders, senders, domains, auto replies, and loops before AI", () => {
		const preferences = mailboxConnectionConfigurationSchema.parse({
			organizationId: 2,
			ownerUserId: 7,
			provider: "gmail",
			providerAccountId: "acct-1",
			accountEmail: "orders@example.com",
			folderIds: ["INBOX"],
			labelIds: [],
			excludedSenders: ["blocked@example.com"],
			excludedDomains: ["noise.test"],
			automationMode: "manual",
			notifyOnNeedsReview: true,
		});
		expect(
			applyMailboxExclusions(
				{
					folderId: "INBOX",
					labelIds: [],
					fromEmail: "orders@example.com",
					headers: {},
				},
				preferences,
			),
		).toEqual({ accepted: false, reason: "mailbox-loop" });
		expect(
			applyMailboxExclusions(
				{
					folderId: "INBOX",
					labelIds: [],
					fromEmail: "person@noise.test",
					headers: {},
				},
				preferences,
			),
		).toEqual({ accepted: false, reason: "excluded-domain" });
		expect(
			applyMailboxExclusions(
				{
					folderId: "INBOX",
					labelIds: [],
					fromEmail: "person@client.test",
					headers: { autoSubmitted: "auto-replied" },
				},
				preferences,
			),
		).toEqual({ accepted: false, reason: "automatic-message" });
	});

	test("bounds the normalized provider-controlled automation headers", () => {
		expect(
			mailboxAutomationHeadersSchema.parse({
				autoSubmitted: " auto-replied ",
			}),
		).toEqual({ autoSubmitted: "auto-replied" });
		expect(
			mailboxAutomationHeadersSchema.safeParse({ rawReceived: "private" }),
		).toMatchObject({ success: false });
		expect(
			mailboxAutomationHeadersSchema.safeParse({ listId: "x".repeat(513) }),
		).toMatchObject({ success: false });
	});

	test("limits administrators to health metadata and denies cross-owner content", () => {
		expect(
			resolveMailboxAccess({
				actorUserId: 9,
				ownerUserId: 7,
				isOrganizationAdmin: true,
				resource: "health",
			}),
		).toEqual({ allowed: true, scope: "administrator-health" });
		expect(
			resolveMailboxAccess({
				actorUserId: 9,
				ownerUserId: 7,
				isOrganizationAdmin: true,
				resource: "content",
			}),
		).toEqual({ allowed: false, reason: "owner-required" });
	});

	test("builds a stable queue identity without retaining message content", () => {
		const first = buildMailboxQueueIdentity({
			connectionId: "connection-1",
			providerMessageId: "message-9",
			contentHash: "sha256:abc",
		});
		const second = buildMailboxQueueIdentity({
			connectionId: "connection-1",
			providerMessageId: "message-9",
			contentHash: "sha256:abc",
		});
		expect(first).toBe(second);
		expect(first).toMatch(/^srq1:[a-f0-9]{64}$/);
		expect(first).not.toContain("message-9");
	});
});
