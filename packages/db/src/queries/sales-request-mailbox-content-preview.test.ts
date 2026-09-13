import { describe, expect, test } from "bun:test";
import {
	buildMailboxQueueIdentity,
	buildMailboxSourceMembershipIdentity,
} from "@gnd/sales-request-mailbox";
import { createPrismaSalesRequestMailboxPreviewSourceResolver } from "./sales-request-mailbox-content-preview";
import {
	hashMailboxProviderMessageIdentity,
	hashMailboxProviderSourceIdentity,
	hashMailboxSourceKey,
} from "./sales-request-mailbox-identities";

const providerMessageId = "Message/Case-Sensitive";
const contentHash = `msc1:${"a".repeat(64)}`;
const queueIdentity = buildMailboxQueueIdentity({
	connectionId: "connection-1",
	providerMessageId,
	contentHash,
});
const sourceKey = "gmail:label:INBOX";
const sourceMembershipIdentity = buildMailboxSourceMembershipIdentity({
	connectionId: "connection-1",
	sourceKey,
	providerMessageId,
	summaryRevision: 4,
});

function database(ownerUserId = 9, sourceSelected = true) {
	const messageHash = hashMailboxProviderMessageIdentity(
		"gmail",
		providerMessageId,
	);
	const connection = {
		id: "connection-1",
		organizationId: 40,
		ownerUserId,
		provider: "gmail",
		state: "active",
		revision: 2,
		policyRevision: 3,
	};
	const tx = {
		$queryRaw: async () => [{ dbNow: new Date("2026-09-13T10:00:00.000Z") }],
		salesRequestMailboxQueueProjection: {
			findUnique: async () => ({
				queueIdentity,
				connectionId: connection.id,
				organizationId: connection.organizationId,
				ownerUserId,
				provider: "gmail",
				providerMessageId,
				providerMessageIdentityHash: messageHash,
				snapshotId: "snapshot-1",
				sourceMembershipId: sourceMembershipIdentity,
				sourceKey,
				sourceSummaryRevision: 4,
				contentHash,
				status: "new",
				withdrawnAt: null,
			}),
		},
		salesRequestMailboxConnection: { findUnique: async () => connection },
		salesRequestMailboxSourceMembership: {
			findUnique: async () => ({
				id: sourceMembershipIdentity,
				connectionId: connection.id,
				sourceId: "source-1",
				messageSummaryId: "summary-1",
				snapshotId: "snapshot-1",
				providerMessageId,
				providerMessageIdentityHash: messageHash,
				summaryRevision: 4,
				state: "active",
				activeKey: `source-1:${messageHash}`,
			}),
		},
		salesRequestMailboxSource: {
			findUnique: async () => ({
				id: "source-1",
				connectionId: connection.id,
				kind: "gmail-label",
				providerSourceId: "INBOX",
				providerSourceIdentityHash: hashMailboxProviderSourceIdentity(
					"gmail-label",
					"INBOX",
				),
				sourceKey,
				sourceKeyIdentityHash: hashMailboxSourceKey(sourceKey),
				selected: sourceSelected,
			}),
		},
		salesRequestMailboxMessageSummary: {
			findUnique: async () => ({
				id: "summary-1",
				connectionId: connection.id,
				sourceId: "source-1",
				provider: "gmail",
				providerMessageId,
				providerMessageIdentityHash: messageHash,
				summaryRevision: 4,
				active: true,
			}),
		},
		salesRequestMailboxMessageSnapshot: {
			findUnique: async () => ({
				id: "snapshot-1",
				connectionId: connection.id,
				provider: "gmail",
				providerMessageId,
				providerMessageIdentityHash: messageHash,
				contentHash,
				modelInput: "Customer asks for one 36 x 80 door.",
				expiresAt: new Date("2026-10-13T10:00:00.000Z"),
			}),
		},
	};
	return {
		db: {
			$transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		},
		connection,
	};
}

describe("Prisma mailbox preview source resolver", () => {
	test("returns model input only after current owner, policy and snapshot checks", async () => {
		const { db } = database();
		const resolveAuthorizedQueue =
			createPrismaSalesRequestMailboxPreviewSourceResolver(db as never, {
				resolveAuthority: async () => ({
					current: true,
					ownerActive: true,
					policy: {
						enabled: true,
						supportedProviders: ["gmail"],
						eligibleUserIds: [9],
						retentionDays: 30,
						maximumAutomationMode: "generate",
						emergencyDisabled: false,
						allowAttachments: false,
						maxAttachmentBytes: 0,
						revision: 3,
						changedAt: null,
					},
				}),
			});

		expect(
			await resolveAuthorizedQueue({
				actorUserId: 9,
				queueIdentity,
				type: "order",
				signal: new AbortController().signal,
			}),
		).toEqual({
			kind: "authorized",
			modelInput: "Customer asks for one 36 x 80 door.",
			identity: { queueIdentity, snapshotIdentity: "snapshot-1", contentHash },
		});
	});

	test("returns forbidden without exposing content for a non-owner", async () => {
		const { db } = database();
		const resolveAuthorizedQueue =
			createPrismaSalesRequestMailboxPreviewSourceResolver(db as never, {
				resolveAuthority: async () => {
					throw new Error("must-not-resolve-authority");
				},
			});
		expect(
			await resolveAuthorizedQueue({
				actorUserId: 10,
				queueIdentity,
				type: "quote",
				signal: new AbortController().signal,
			}),
		).toEqual({ kind: "forbidden" });
	});

	test("returns stale when the selected source membership no longer matches", async () => {
		const { db } = database(9, false);
		const resolveAuthorizedQueue =
			createPrismaSalesRequestMailboxPreviewSourceResolver(db as never, {
				resolveAuthority: async () => ({
					current: true,
					ownerActive: true,
					policy: {
						enabled: true,
						supportedProviders: ["gmail"],
						eligibleUserIds: [9],
						retentionDays: 30,
						maximumAutomationMode: "generate",
						emergencyDisabled: false,
						allowAttachments: false,
						maxAttachmentBytes: 0,
						revision: 3,
						changedAt: null,
					},
				}),
			});

		expect(
			await resolveAuthorizedQueue({
				actorUserId: 9,
				queueIdentity,
				type: "order",
				signal: new AbortController().signal,
			}),
		).toEqual({ kind: "stale" });
	});
});
