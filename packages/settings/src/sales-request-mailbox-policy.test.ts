import { describe, expect, test } from "bun:test";
import { DEFAULT_SALES_REQUEST_MAILBOX_POLICY } from "@gnd/sales-request-mailbox";
import {
	getSalesRequestMailboxPolicy,
	updateSalesRequestMailboxPolicy,
} from "./sales-request-mailbox-policy";

const settingId = 11;

function fixture(initialMeta: unknown) {
	let meta = initialMeta;
	const events: string[] = [];
	const settings = {
		findFirst: async () => {
			events.push("read");
			return { id: settingId, meta };
		},
		update: async ({ data }: { data: { meta: unknown } }) => {
			events.push("update");
			meta = data.meta;
		},
	};
	const tx = {
		$queryRaw: async () => {
			events.push("lock");
			return [{ id: settingId }];
		},
		settings,
	};
	const db = {
		settings,
		$transaction: async (callback: (value: typeof tx) => unknown) => {
			events.push("transaction");
			return callback(tx);
		},
	};
	return {
		db: db as never,
		readDb: db as never,
		meta: () => meta,
		events,
	};
}

describe("Sales Request mailbox policy settings", () => {
	test("fails closed when mailbox policy is absent or invalid", async () => {
		const absent = fixture({ requestGeneration: { pilot: {} } });
		await expect(
			getSalesRequestMailboxPolicy(absent.readDb, settingId),
		).resolves.toEqual({
			settingId,
			policy: DEFAULT_SALES_REQUEST_MAILBOX_POLICY,
			source: "default",
		});

		const invalid = fixture({
			requestGeneration: { mailbox: { enabled: true } },
		});
		await expect(
			getSalesRequestMailboxPolicy(invalid.readDb, settingId),
		).resolves.toMatchObject({
			policy: DEFAULT_SALES_REQUEST_MAILBOX_POLICY,
			source: "invalid",
		});
	});

	test("locks and deep-merges a named, read-only provider policy", async () => {
		const state = fixture({
			preserve: true,
			requestGeneration: { pilot: { revision: 4 } },
		});
		const result = await updateSalesRequestMailboxPolicy(state.db, {
			settingId,
			enabled: true,
			supportedProviders: ["microsoft-graph", "gmail", "gmail"],
			eligibleUserIds: [8, 2, 8],
			retentionDays: 30,
			maximumAutomationMode: "classify",
			emergencyDisabled: false,
			allowAttachments: false,
			maxAttachmentBytes: 0,
			changedAt: new Date("2026-09-13T14:00:00.000Z"),
		});
		expect(result).toMatchObject({
			changed: true,
			settingId,
			source: "persisted",
			policy: {
				revision: 1,
				supportedProviders: ["gmail", "microsoft-graph"],
				eligibleUserIds: [2, 8],
			},
		});
		expect(state.events).toEqual(["transaction", "lock", "read", "update"]);
		expect(state.meta()).toEqual({
			preserve: true,
			requestGeneration: {
				pilot: { revision: 4 },
				mailbox: result.policy,
			},
		});
	});

	test("does not rewrite an identical normalized policy", async () => {
		const state = fixture({
			requestGeneration: {
				mailbox: {
					enabled: false,
					supportedProviders: [],
					eligibleUserIds: [],
					retentionDays: 30,
					maximumAutomationMode: "manual",
					emergencyDisabled: true,
					allowAttachments: false,
					maxAttachmentBytes: 0,
					revision: 3,
					changedAt: "2026-09-12T12:00:00.000Z",
				},
			},
		});
		const result = await updateSalesRequestMailboxPolicy(state.db, {
			settingId,
			enabled: false,
			supportedProviders: [],
			eligibleUserIds: [],
			retentionDays: 30,
			maximumAutomationMode: "manual",
			emergencyDisabled: true,
			allowAttachments: false,
			maxAttachmentBytes: 0,
		});
		expect(result.changed).toBe(false);
		expect(state.events).not.toContain("update");
	});
});
