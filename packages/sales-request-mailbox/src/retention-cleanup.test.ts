import { describe, expect, test } from "bun:test";
import {
	MAILBOX_RETENTION_PURGE_BEHAVIOR,
	purgeExpiredMailboxContent,
} from "./retention-cleanup";

describe("mailbox retention cleanup", () => {
	test("runs one bounded transaction with explicit privacy-safe ordering", async () => {
		const calls: unknown[] = [];
		const result = await purgeExpiredMailboxContent(
			{},
			{
				purgeExpiredMailboxData: async (input) => {
					calls.push(input);
					return {
						counts: {
							queueRows: 2,
							memberships: 3,
							leases: 2,
							summaries: 2,
							snapshots: 2,
							oauthAttempts: 4,
						},
						hasMore: true,
					};
				},
			},
		);

		expect(calls).toEqual([
			{ limit: 200, behavior: MAILBOX_RETENTION_PURGE_BEHAVIOR },
		]);
		expect(result).toMatchObject({ hasMore: true, counts: { snapshots: 2 } });
		expect(MAILBOX_RETENTION_PURGE_BEHAVIOR.transactionOrder).toEqual([
			"delete-current-queue-if-no-retained-snapshot",
			"delete-source-memberships-if-no-retained-snapshot",
			"delete-message-leases-if-no-retained-snapshot",
			"delete-message-summaries-if-no-retained-snapshot",
			"delete-selected-expired-snapshots",
			"delete-selected-terminal-or-expired-oauth-attempts",
		]);
	});

	test("rejects invalid limits and non-exact store results", async () => {
		const store = {
			purgeExpiredMailboxData: async () => ({
				counts: {
					queueRows: 0,
					memberships: 0,
					leases: 0,
					summaries: 0,
					snapshots: -1,
					oauthAttempts: 0,
				},
				hasMore: false,
			}),
		};
		await expect(
			purgeExpiredMailboxContent({ limit: 501 }, store),
		).rejects.toThrow("invalid-mailbox-retention-limit");
		await expect(purgeExpiredMailboxContent({}, store)).rejects.toThrow(
			"invalid-mailbox-retention-result",
		);
		await expect(
			purgeExpiredMailboxContent(
				{},
				{
					purgeExpiredMailboxData: async () => ({
						counts: {
							queueRows: 0,
							memberships: 0,
							leases: 0,
							summaries: 0,
							snapshots: 0,
							oauthAttempts: 0,
							unexpected: 1,
						},
						hasMore: false,
					}),
				},
			),
		).rejects.toThrow("invalid-mailbox-retention-result");
	});

	test("does not enter the store after cancellation", async () => {
		const controller = new AbortController();
		controller.abort();
		let calls = 0;
		await expect(
			purgeExpiredMailboxContent(
				{ signal: controller.signal },
				{
					purgeExpiredMailboxData: async () => {
						calls += 1;
						throw new Error("must not run");
					},
				},
			),
		).rejects.toThrow();
		expect(calls).toBe(0);
	});
});
