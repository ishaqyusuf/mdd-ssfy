import { describe, expect, it } from "bun:test";

import {
	type SalesRequestProviderBenchmarkApproval,
	getSalesRequestProviderBenchmarkApproval,
	isSalesRequestProviderBenchmarkApprovalCurrent,
	salesRequestProviderBenchmarkApprovalInputSchema,
	updateSalesRequestProviderBenchmarkApproval,
} from "./sales-request-provider-benchmark-settings";

const settingId = 7;
const approvedAt = new Date("2026-09-13T12:00:00.000Z");
const evidenceDigest = `sha256:${"a".repeat(64)}`;

function fakeDatabase(
	initialMeta: unknown,
	options: { lockedSettingId?: number | null } = {},
) {
	let meta = initialMeta;
	let updateCount = 0;
	let transactionCount = 0;
	const events: string[] = [];
	const settings = {
		findFirst: async () => {
			events.push("read");
			return { id: settingId, meta };
		},
		update: async ({ data }: { data: { meta: unknown } }) => {
			events.push("update");
			updateCount += 1;
			meta = data.meta;
		},
	};
	const transactionClient = {
		$queryRaw: async () => {
			events.push("lock");
			const lockedSettingId =
				options.lockedSettingId === undefined
					? settingId
					: options.lockedSettingId;
			return lockedSettingId == null ? [] : [{ id: lockedSettingId }];
		},
		settings,
	};
	const db = {
		settings,
		$transaction: async (
			callback: (tx: typeof transactionClient) => unknown,
			options: unknown,
		) => {
			transactionCount += 1;
			events.push("transaction");
			expect(options).toEqual({
				isolationLevel: "Serializable",
				timeout: 60_000,
			});
			return callback(transactionClient);
		},
	};

	return {
		db: db as unknown as Parameters<
			typeof updateSalesRequestProviderBenchmarkApproval
		>[0],
		getDb: db as unknown as Parameters<
			typeof getSalesRequestProviderBenchmarkApproval
		>[0],
		getEvents: () => events,
		getMeta: () => meta,
		getTransactionCount: () => transactionCount,
		getUpdateCount: () => updateCount,
	};
}

function validApproval(
	overrides: Partial<SalesRequestProviderBenchmarkApproval> = {},
): SalesRequestProviderBenchmarkApproval {
	return {
		approved: true,
		provider: "openai",
		model: "gpt-5-mini",
		evaluationRunId: "2026-09-13T120000Z-openai-v1",
		corpusVersion: "sales-request-text-v1",
		policyVersion: "pilot-gates-v1",
		configurationRevision: "c".repeat(64),
		promptVersion: "new-sales-form-seed-v6",
		schemaVersion: 2,
		evidenceDigest,
		approvedByUserId: 19,
		approvedAt: approvedAt.toISOString(),
		revision: 1,
		...overrides,
	};
}

const acceptCurrentIdentity = async () => {};

describe("sales request provider benchmark approval", () => {
	it("fails closed when the approval is missing", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				ai: { provider: "openai", model: "gpt-5-mini" },
			},
		});

		await expect(
			getSalesRequestProviderBenchmarkApproval(fixture.getDb, settingId),
		).resolves.toEqual({
			settingId,
			approval: null,
			approved: false,
			source: "missing",
		});
	});

	it("fails closed for malformed evidence or approval metadata", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				ai: { provider: "openai", model: "gpt-5-mini" },
				providerBenchmarkApproval: validApproval({
					evidenceDigest: "not-a-digest",
				}),
			},
		});

		await expect(
			getSalesRequestProviderBenchmarkApproval(fixture.getDb, settingId),
		).resolves.toMatchObject({
			approval: null,
			approved: false,
			source: "invalid",
		});
	});

	it("fails closed when the active provider/model selection is missing", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				providerBenchmarkApproval: validApproval(),
			},
		});

		await expect(
			getSalesRequestProviderBenchmarkApproval(fixture.getDb, settingId),
		).resolves.toMatchObject({ approved: false, source: "missing-selection" });
	});

	it("fails closed when the approval belongs to a stale selection", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				ai: { provider: "google", model: "gemini-3.8-flash" },
				providerBenchmarkApproval: validApproval(),
			},
		});

		await expect(
			getSalesRequestProviderBenchmarkApproval(fixture.getDb, settingId),
		).resolves.toMatchObject({
			approval: validApproval(),
			approved: false,
			source: "stale",
		});
	});

	it("returns an explicit persisted approval only for the active selection", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				ai: { provider: "openai", model: "gpt-5-mini" },
				providerBenchmarkApproval: validApproval(),
			},
		});

		await expect(
			getSalesRequestProviderBenchmarkApproval(fixture.getDb, settingId),
		).resolves.toEqual({
			settingId,
			approval: validApproval(),
			approved: true,
			source: "persisted",
		});
	});

	it("requires prompt, schema, and configuration identity at the runtime gate", () => {
		const approval = validApproval();
		const identity = {
			provider: approval.provider,
			model: approval.model,
			configurationRevision: approval.configurationRevision,
			promptVersion: approval.promptVersion,
			schemaVersion: approval.schemaVersion,
			corpusVersion: approval.corpusVersion,
			policyVersion: approval.policyVersion,
		};
		expect(
			isSalesRequestProviderBenchmarkApprovalCurrent(approval, identity),
		).toBe(true);
		expect(
			isSalesRequestProviderBenchmarkApprovalCurrent(approval, {
				...identity,
				configurationRevision: "d".repeat(64),
			}),
		).toBe(false);
		expect(
			isSalesRequestProviderBenchmarkApprovalCurrent(approval, {
				...identity,
				corpusVersion: "sales-request-text-v2",
			}),
		).toBe(false);
		expect(
			isSalesRequestProviderBenchmarkApprovalCurrent(approval, {
				...identity,
				policyVersion: "pilot-gates-v2",
			}),
		).toBe(false);
		expect(
			isSalesRequestProviderBenchmarkApprovalCurrent(approval, {
				...identity,
				promptVersion: "new-sales-form-seed-v7",
			}),
		).toBe(false);
		expect(
			isSalesRequestProviderBenchmarkApprovalCurrent(approval, {
				...identity,
				schemaVersion: 1,
			}),
		).toBe(false);
	});

	it("rejects cross-provider models and unbounded version tokens", () => {
		expect(
			salesRequestProviderBenchmarkApprovalInputSchema.safeParse({
				approved: true,
				provider: "google",
				model: "gpt-5-mini",
				evaluationRunId: "run-1",
				corpusVersion: "sales request corpus v1",
				policyVersion: "x".repeat(65),
				configurationRevision: "c".repeat(64),
				promptVersion: "new-sales-form-seed-v6",
				schemaVersion: 2,
				evidenceDigest,
				approvedByUserId: 19,
			}).success,
		).toBe(false);
	});

	it("locks and deep-merges a versioned record without dropping metadata", async () => {
		const fixture = fakeDatabase({
			unrelated: { preserve: true },
			requestGeneration: {
				defaultsVersion: 3,
				ai: { provider: "openai", model: "gpt-5-mini" },
			},
		});

		const result = await updateSalesRequestProviderBenchmarkApproval(
			fixture.db,
			{
				settingId,
				approved: true,
				provider: "openai",
				model: "gpt-5-mini",
				evaluationRunId: "2026-09-13T120000Z-openai-v1",
				corpusVersion: "sales-request-text-v1",
				policyVersion: "pilot-gates-v1",
				configurationRevision: "c".repeat(64),
				promptVersion: "new-sales-form-seed-v6",
				schemaVersion: 2,
				evidenceDigest,
				approvedByUserId: 19,
				approvedAt,
			},
			acceptCurrentIdentity,
		);

		expect(result).toEqual({
			changed: true,
			settingId,
			approval: validApproval(),
			approved: true,
			source: "persisted",
		});
		expect(fixture.getEvents()).toEqual([
			"transaction",
			"lock",
			"read",
			"update",
		]);
		expect(fixture.getMeta()).toEqual({
			unrelated: { preserve: true },
			requestGeneration: {
				defaultsVersion: 3,
				ai: { provider: "openai", model: "gpt-5-mini" },
				providerBenchmarkApproval: validApproval(),
			},
		});
	});

	it("refuses a stale selection before writing", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				ai: { provider: "google", model: "gemini-3.8-flash" },
			},
		});

		await expect(
			updateSalesRequestProviderBenchmarkApproval(
				fixture.db,
				{
					settingId,
					approved: true,
					provider: "openai",
					model: "gpt-5-mini",
					evaluationRunId: "2026-09-13T120000Z-openai-v1",
					corpusVersion: "sales-request-text-v1",
					policyVersion: "pilot-gates-v1",
					configurationRevision: "c".repeat(64),
					promptVersion: "new-sales-form-seed-v6",
					schemaVersion: 2,
					evidenceDigest,
					approvedByUserId: 19,
					approvedAt,
				},
				acceptCurrentIdentity,
			),
		).rejects.toThrow("active sales request AI selection");
		expect(fixture.getUpdateCount()).toBe(0);
	});

	it("refuses a row that is no longer the active sales settings authority", async () => {
		const fixture = fakeDatabase(
			{
				requestGeneration: {
					ai: { provider: "openai", model: "gpt-5-mini" },
				},
			},
			{ lockedSettingId: 3 },
		);

		await expect(
			updateSalesRequestProviderBenchmarkApproval(
				fixture.db,
				{
					settingId,
					approved: true,
					provider: "openai",
					model: "gpt-5-mini",
					evaluationRunId: "run-1",
					corpusVersion: "sales-request-text-v1",
					policyVersion: "pilot-gates-v1",
					configurationRevision: "c".repeat(64),
					promptVersion: "new-sales-form-seed-v6",
					schemaVersion: 2,
					evidenceDigest,
					approvedByUserId: 19,
					approvedAt,
				},
				acceptCurrentIdentity,
			),
		).rejects.toThrow("no longer the active row");
		expect(fixture.getEvents()).toEqual(["transaction", "lock"]);
		expect(fixture.getUpdateCount()).toBe(0);
	});

	it("runs the current-identity verifier after locking and before writing", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				ai: { provider: "openai", model: "gpt-5-mini" },
			},
		});

		await expect(
			updateSalesRequestProviderBenchmarkApproval(
				fixture.db,
				{
					settingId,
					approved: true,
					provider: "openai",
					model: "gpt-5-mini",
					evaluationRunId: "run-1",
					corpusVersion: "sales-request-text-v1",
					policyVersion: "pilot-gates-v1",
					configurationRevision: "c".repeat(64),
					promptVersion: "new-sales-form-seed-v6",
					schemaVersion: 2,
					evidenceDigest,
					approvedByUserId: 19,
					approvedAt,
				},
				async () => {
					throw new Error("configuration changed");
				},
			),
		).rejects.toThrow("configuration changed");
		expect(fixture.getEvents()).toEqual(["transaction", "lock", "read"]);
		expect(fixture.getUpdateCount()).toBe(0);
	});

	it("increments the revision for every new approval decision", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				ai: { provider: "openai", model: "gpt-5-mini" },
				providerBenchmarkApproval: validApproval(),
			},
		});

		const result = await updateSalesRequestProviderBenchmarkApproval(
			fixture.db,
			{
				settingId,
				approved: false,
				provider: "openai",
				model: "gpt-5-mini",
				evaluationRunId: "2026-09-13T120000Z-openai-v2",
				corpusVersion: "sales-request-text-v1",
				policyVersion: "pilot-gates-v2",
				configurationRevision: "c".repeat(64),
				promptVersion: "new-sales-form-seed-v6",
				schemaVersion: 2,
				evidenceDigest: `sha256:${"b".repeat(64)}`,
				approvedByUserId: 23,
				approvedAt,
			},
			acceptCurrentIdentity,
		);

		expect(result).toMatchObject({
			approved: false,
			approval: { approved: false, revision: 2 },
		});
		expect(fixture.getTransactionCount()).toBe(1);
	});

	it("fails closed instead of overflowing the bounded approval revision", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				ai: { provider: "openai", model: "gpt-5-mini" },
				providerBenchmarkApproval: validApproval({ revision: 2_147_483_647 }),
			},
		});

		await expect(
			updateSalesRequestProviderBenchmarkApproval(
				fixture.db,
				{
					settingId,
					approved: true,
					provider: "openai",
					model: "gpt-5-mini",
					evaluationRunId: "2026-09-13T120000Z-openai-v1",
					corpusVersion: "sales-request-text-v1",
					policyVersion: "pilot-gates-v1",
					configurationRevision: "c".repeat(64),
					promptVersion: "new-sales-form-seed-v6",
					schemaVersion: 2,
					evidenceDigest,
					approvedByUserId: 19,
					approvedAt,
				},
				acceptCurrentIdentity,
			),
		).rejects.toThrow("revision limit reached");
		expect(fixture.getUpdateCount()).toBe(0);
	});

	it("rejects invalid input before opening a transaction", async () => {
		const fixture = fakeDatabase({});

		await expect(
			updateSalesRequestProviderBenchmarkApproval(
				fixture.db,
				{
					settingId,
					approved: true,
					provider: "openai",
					model: "deepseek-v4-flash",
					evaluationRunId: "run-1",
					corpusVersion: "v1",
					policyVersion: "v1",
					configurationRevision: "c".repeat(64),
					promptVersion: "new-sales-form-seed-v6",
					schemaVersion: 2,
					evidenceDigest,
					approvedByUserId: 19,
				},
				acceptCurrentIdentity,
			),
		).rejects.toThrow();
		expect(fixture.getTransactionCount()).toBe(0);
	});
});
