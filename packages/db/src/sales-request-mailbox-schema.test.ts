import { describe, expect, test } from "bun:test";

const schema = await Bun.file(
	new URL("./schema/sales-request-mailbox.prisma", import.meta.url),
).text();

const modelNames = Array.from(schema.matchAll(/^model\s+(\w+)\s*\{/gm)).map(
	(match) => match[1],
);

describe("Sales Request mailbox MVP schema", () => {
	test("contains exactly the reviewed nine-table persistence cut", () => {
		expect(modelNames).toEqual([
			"SalesRequestMailboxOAuthAttempt",
			"SalesRequestMailboxConnection",
			"SalesRequestMailboxSource",
			"SalesRequestMailboxSyncStream",
			"SalesRequestMailboxMessageSummary",
			"SalesRequestMailboxMessageLease",
			"SalesRequestMailboxSourceMembership",
			"SalesRequestMailboxMessageSnapshot",
			"SalesRequestMailboxQueueProjection",
		]);
		for (const deferred of [
			"Attachment",
			"Subscription",
			"Outbound",
			"CustomerMatch",
			"GenerationResult",
			"SalesDraft",
		]) {
			expect(schema).not.toContain(`model SalesRequestMailbox${deferred}`);
		}
	});

	test("encodes global account, stream, message, snapshot, and queue identities", () => {
		expect(schema).toContain(
			'@@unique([provider, providerAccountIdentityHash], name: "sales_req_mailbox_provider_account_uq")',
		);
		expect(schema).toContain(
			'@@unique([connectionId, sourceKeyIdentityHash], name: "sales_req_mailbox_source_uq")',
		);
		expect(schema).toContain(
			'@@unique([connectionId, sourceId], name: "sales_req_mailbox_stream_uq")',
		);
		expect(schema).toContain(
			'@@unique([connectionId, sourceId, providerMessageIdentityHash], name: "sales_req_mailbox_summary_uq")',
		);
		expect(schema).toContain(
			'@@unique([connectionId, providerMessageIdentityHash], name: "sales_req_mailbox_lease_uq")',
		);
		expect(schema).toContain(
			'@@unique([connectionId, providerMessageIdentityHash, schemaVersion, contentHash], name: "sales_req_mailbox_snapshot_uq")',
		);
		expect(schema).toContain(
			'@@unique([connectionId, providerMessageIdentityHash], name: "sales_req_mailbox_current_queue_uq")',
		);
	});

	test("keeps secrets and private message content nullable for disconnect cleanup", () => {
		for (const field of [
			/providerAccountId\s+String\?/,
			/accessTokenEnvelope\s+Json\?/,
			/refreshTokenEnvelope\s+Json\?/,
			/displayText\s+String/,
			/modelInput\s+String/,
		]) {
			expect(schema).toMatch(field);
		}
		expect(schema).toMatch(/activeKey\s+String\?\s+@unique/);
		expect(schema).toMatch(
			/model SalesRequestMailboxMessageSnapshot[\s\S]*?expiresAt\s+DateTime/,
		);
		expect(schema).toMatch(/snapshotId\s+String\s+@db\.VarChar\(191\)/);
		for (const identityField of [
			"scopeFingerprint",
			"sourceMembershipIdentity",
			"contentHash",
		]) {
			expect(schema).toMatch(
				new RegExp(
					`${identityField}\\s+String\\??\\s+@db\\.VarChar\\((69|80)\\)`,
				),
			);
		}
		expect(schema).toMatch(
			/queueIdentity\s+String\s+@unique[^\n]+@db\.VarChar\(80\)/,
		);
	});

	test("persists reference-only job resolution and exact provider identities", () => {
		for (const field of [
			/providerAccountIdentityHash\s+String\?\s+@db\.Char\(64\)/,
			/sourceKeyIdentityHash\s+String\s+@db\.Char\(64\)/,
			/providerSourceIdentityHash\s+String\s+@db\.Char\(64\)/,
			/providerMessageIdentityHash\s+String\s+@db\.Char\(64\)/,
			/healthOperationReason\s+String\?/,
			/healthOperationConnectionRevision\s+Int\?/,
			/healthOperationId\s+String\?\s+@unique/,
			/disconnectId\s+String\?\s+@unique/,
		]) {
			expect(schema).toMatch(field);
		}
	});

	test("includes bounded due, retention, and owner-private Inbox access indexes", () => {
		for (const indexName of [
			"sales_req_mailbox_oauth_expiry_idx",
			"sales_req_mailbox_owner_state_idx",
			"sales_req_mailbox_health_due_idx",
			"sales_req_mailbox_disconnect_idx",
			"sales_req_mailbox_stream_due_idx",
			"sales_req_mailbox_summary_detail_idx",
			"sales_req_mailbox_summary_message_idx",
			"sales_req_mailbox_lease_due_idx",
			"sales_req_mailbox_membership_active_idx",
			"sales_req_mailbox_snapshot_expiry_idx",
			"sales_req_mailbox_inbox_idx",
			"sales_req_mailbox_inbox_all_idx",
		]) {
			expect(schema).toContain(`name: "${indexName}"`);
		}
	});
});
