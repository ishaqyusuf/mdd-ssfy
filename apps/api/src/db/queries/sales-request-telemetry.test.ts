import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";
import {
	anonymizeSalesRequestGenerationRunsForUser,
	completeSalesRequestGenerationRun,
	consumeSalesRequestGenerationRun,
	createSalesRequestGenerationRun,
	getSalesRequestGenerationPilotSummary,
	markSalesRequestGenerationProviderAttempted,
	purgeExpiredSalesRequestGenerationRuns,
	recordSalesRequestGenerationOutcome,
} from "./sales-request-telemetry";

const now = new Date("2026-09-12T12:00:00.000Z");

function row(overrides: Record<string, unknown> = {}) {
	return {
		generationId: "11111111-1111-4111-8111-111111111111",
		actorUserId: 7,
		scope: "sales-settings:7",
		configurationRevision: "a".repeat(64),
		provider: "openai",
		model: "gpt-5-mini",
		promptVersion: "new-sales-form-seed-v6",
		schemaVersion: 2,
		pilotSettingsRevision: 1,
		providerBenchmarkApprovalRevision: 1,
		status: "succeeded",
		seedDigest: `h1:${"c".repeat(64)}`,
		consumedSalesId: null,
		hasText: true,
		latencyMs: 800,
		providerAttemptedAt: new Date("2026-09-12T11:58:01.000Z"),
		providerLatencyMs: 700,
		inputTokens: 100,
		outputTokens: 20,
		issueCounts: { ambiguous: 0, unreadable: 0, unsupported: 0 },
		applyOutcome: null,
		applyAt: null,
		saveDraftOutcome: null,
		saveDraftAt: null,
		saveFinalOutcome: null,
		saveFinalAt: null,
		feedbackOutcome: null,
		feedbackIssueCategories: null,
		feedbackChangedFieldCategories: null,
		feedbackAt: null,
		correctionMs: null,
		startedAt: new Date("2026-09-12T11:58:00.000Z"),
		completedAt: new Date("2026-09-12T11:59:00.000Z"),
		retentionUntil: new Date("2026-12-11T12:00:00.000Z"),
		deletedAt: null,
		createdAt: new Date("2026-09-12T11:58:00.000Z"),
		...overrides,
	};
}

function dbFixture(initial = row()) {
	let current = { ...initial };
	const calls: Array<{ method: string; args: unknown }> = [];
	const db = {
		salesRequestGenerationRun: {
			create: async (args: unknown) => {
				calls.push({ method: "create", args });
				current = {
					...current,
					...((args as { data: object }).data as object),
				};
				return current;
			},
			findUnique: async (args: unknown) => {
				calls.push({ method: "findUnique", args });
				return current.generationId ? current : null;
			},
			updateMany: async (args: unknown) => {
				calls.push({ method: "updateMany", args });
				const payload = args as {
					where?: Record<string, unknown>;
					data?: Record<string, unknown>;
				};
				const where = payload.where ?? {};
				if (
					where.generationId !== undefined &&
					current.generationId !== where.generationId
				)
					return { count: 0 };
				if (
					where.actorUserId !== undefined &&
					current.actorUserId !== where.actorUserId
				)
					return { count: 0 };
				if (where.status !== undefined && current.status !== where.status)
					return { count: 0 };
				if (where.hasText !== undefined && current.hasText !== where.hasText)
					return { count: 0 };
				if (
					where.consumedSalesId !== undefined &&
					current.consumedSalesId !== where.consumedSalesId
				)
					return { count: 0 };
				if (where.deletedAt === null && current.deletedAt !== null)
					return { count: 0 };
				if (
					where.completedAt &&
					(where.completedAt as { not?: unknown }).not === null &&
					current.completedAt == null
				)
					return { count: 0 };
				if (
					where.seedDigest &&
					(where.seedDigest as { not?: unknown }).not === null &&
					current.seedDigest == null
				)
					return { count: 0 };
				if (
					where.retentionUntil &&
					current.retentionUntil.getTime() <=
						(where.retentionUntil as { gt: Date }).gt.getTime()
				)
					return { count: 0 };
				if (
					Array.isArray(where.OR) &&
					!where.OR.some(
						(condition) =>
							current.consumedSalesId ===
							(condition as { consumedSalesId: number | null }).consumedSalesId,
					)
				)
					return { count: 0 };
				const field = Object.keys(where).find((key) =>
					[
						"providerAttemptedAt",
						"applyOutcome",
						"saveDraftOutcome",
						"saveFinalOutcome",
						"feedbackOutcome",
					].includes(key),
				);
				if (field && current[field] !== where[field]) return { count: 0 };
				current = { ...current, ...(payload.data ?? {}) };
				return { count: 1 };
			},
			findMany: async (args: unknown) => {
				calls.push({ method: "findMany", args });
				return [current];
			},
			deleteMany: async (args: unknown) => {
				calls.push({ method: "deleteMany", args });
				return { count: 1 };
			},
		},
	};
	return { db, calls, getRow: () => current };
}

describe("sales request generation telemetry persistence", () => {
	test("creates a metadata-only run with a bounded retention deadline", async () => {
		const fixture = dbFixture();
		await createSalesRequestGenerationRun(fixture.db, {
			actorUserId: 7,
			generationId: "22222222-2222-4222-8222-222222222222",
			scope: "sales-settings:7",
			configurationRevision: "b".repeat(64),
			provider: "openai",
			model: "gpt-5-mini",
			promptVersion: "new-sales-form-seed-v6",
			schemaVersion: 2,
			pilotSettingsRevision: 1,
			providerBenchmarkApprovalRevision: 1,
			hasText: true,
			startedAt: now,
		});

		const createArgs = fixture.calls[0]?.args as {
			data: Record<string, unknown>;
		};
		expect(createArgs.data).toMatchObject({
			generationId: "22222222-2222-4222-8222-222222222222",
			actorUserId: 7,
			promptVersion: "new-sales-form-seed-v6",
			schemaVersion: 2,
			pilotSettingsRevision: 1,
			providerBenchmarkApprovalRevision: 1,
			hasText: true,
			status: "started",
		});
		expect(createArgs.data.retentionUntil).toEqual(
			new Date("2026-12-11T12:00:00.000Z"),
		);
		expect(JSON.stringify(createArgs.data)).not.toMatch(
			/base64|contact|credential|providerBody|sourceText/i,
		);
	});

	test("completes a run with safe outcome metadata only", async () => {
		const fixture = dbFixture();
		await completeSalesRequestGenerationRun(fixture.db, {
			actorUserId: 7,
			generationId: row().generationId,
			status: "succeeded",
			completedAt: now,
			latencyMs: 4_500,
			providerLatencyMs: 4_000,
			provider: "openai",
			model: "gpt-5-mini",
			promptVersion: "new-sales-form-seed-v6",
			schemaVersion: 2,
			seedDigest: `h1:${"c".repeat(64)}`,
			inputTokens: 100,
			outputTokens: 20,
			issueCounts: { ambiguous: 1, unreadable: 0, unsupported: 0 },
		});

		expect(fixture.calls.at(-1)).toMatchObject({
			method: "updateMany",
			args: {
				data: expect.objectContaining({
					status: "succeeded",
					latencyMs: 4_500,
					providerLatencyMs: 4_000,
					seedDigest: `h1:${"c".repeat(64)}`,
				}),
			},
		});
		expect(JSON.stringify(fixture.calls.at(-1))).not.toMatch(
			/source|private|error.*body/i,
		);
	});

	test("marks one durable provider attempt before paid work", async () => {
		const fixture = dbFixture(
			row({
				status: "started",
				providerAttemptedAt: null,
			}),
		);
		await markSalesRequestGenerationProviderAttempted(fixture.db, {
			actorUserId: 7,
			generationId: row().generationId,
			attemptedAt: now,
		});
		expect(fixture.getRow().providerAttemptedAt).toEqual(now);
		expect(fixture.calls.at(-1)).toMatchObject({
			method: "updateMany",
			args: {
				where: {
					status: "started",
					providerAttemptedAt: null,
				},
			},
		});

		await expect(
			markSalesRequestGenerationProviderAttempted(fixture.db, {
				actorUserId: 7,
				generationId: row().generationId,
				attemptedAt: now,
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	test("omits malformed seed digests instead of persisting or erasing content", async () => {
		const fixture = dbFixture();
		await completeSalesRequestGenerationRun(fixture.db, {
			actorUserId: 7,
			generationId: row().generationId,
			status: "succeeded",
			completedAt: now,
			latencyMs: 100,
			seedDigest: "private seed content",
		});

		expect(fixture.calls.at(-1)).toMatchObject({
			method: "updateMany",
			args: { data: { status: "succeeded" } },
		});
		expect(
			(fixture.calls.at(-1)?.args as { data: Record<string, unknown> }).data,
		).not.toHaveProperty("seedDigest");
	});

	test("rejects completion after the retention deadline", async () => {
		const fixture = dbFixture();
		fixture.db.salesRequestGenerationRun.updateMany = async (args: unknown) => {
			fixture.calls.push({ method: "updateMany", args });
			return { count: 0 };
		};

		await expect(
			completeSalesRequestGenerationRun(fixture.db, {
				actorUserId: 7,
				generationId: row().generationId,
				status: "succeeded",
				completedAt: now,
				latencyMs: 100,
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(fixture.calls.at(-1)).toMatchObject({
			args: { where: { retentionUntil: { gt: now } } },
		});
	});

	test("binds outcomes to the creating actor and makes repeated writes idempotent", async () => {
		const fixture = dbFixture();
		const input = {
			actorUserId: 7,
			generationId: row().generationId,
			kind: "apply" as const,
			outcome: "applied" as const,
		};

		await expect(
			recordSalesRequestGenerationOutcome(fixture.db, { ...input, now }),
		).resolves.toMatchObject({
			recorded: true,
			duplicate: false,
		});
		await expect(
			recordSalesRequestGenerationOutcome(fixture.db, { ...input, now }),
		).resolves.toMatchObject({
			recorded: false,
			duplicate: true,
		});
		await expect(
			recordSalesRequestGenerationOutcome(fixture.db, {
				...input,
				actorUserId: 8,
				now,
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	test("promotes retryable failures to terminal apply and save success", async () => {
		const fixture = dbFixture();
		const base = {
			actorUserId: 7,
			generationId: row().generationId,
			now,
		};

		await recordSalesRequestGenerationOutcome(fixture.db, {
			...base,
			kind: "apply",
			outcome: "blocked",
		});
		await expect(
			recordSalesRequestGenerationOutcome(fixture.db, {
				...base,
				kind: "apply",
				outcome: "applied",
			}),
		).resolves.toMatchObject({ recorded: true, duplicate: false });
		await recordSalesRequestGenerationOutcome(fixture.db, {
			...base,
			kind: "save",
			stage: "draft",
			outcome: "failed",
		});
		await expect(
			recordSalesRequestGenerationOutcome(fixture.db, {
				...base,
				kind: "save",
				stage: "draft",
				outcome: "saved",
			}),
		).resolves.toMatchObject({ recorded: true, duplicate: false });

		expect(fixture.getRow()).toMatchObject({
			applyOutcome: "applied",
			saveDraftOutcome: "saved",
		});
	});

	test("resolves a final-save exception monotonically after a successful retry", async () => {
		const fixture = dbFixture();
		const base = {
			actorUserId: 7,
			generationId: row().generationId,
			now,
		};
		await recordSalesRequestGenerationOutcome(fixture.db, {
			...base,
			kind: "apply",
			outcome: "applied",
		});
		await recordSalesRequestGenerationOutcome(fixture.db, {
			...base,
			kind: "save",
			stage: "final",
			outcome: "failed",
		});
		await expect(
			recordSalesRequestGenerationOutcome(fixture.db, {
				...base,
				kind: "save",
				stage: "final",
				outcome: "saved",
			}),
		).resolves.toMatchObject({ recorded: true, duplicate: false });
		await expect(
			recordSalesRequestGenerationOutcome(fixture.db, {
				...base,
				kind: "save",
				stage: "final",
				outcome: "failed",
			}),
		).resolves.toMatchObject({ recorded: false, ignored: true });
		expect(fixture.getRow().saveFinalOutcome).toBe("saved");
	});

	test("measures edited correction from Apply to feedback only", async () => {
		const feedbackFixture = dbFixture();
		await recordSalesRequestGenerationOutcome(feedbackFixture.db, {
			actorUserId: 7,
			generationId: row().generationId,
			kind: "apply",
			outcome: "applied",
			now,
		});
		expect(feedbackFixture.getRow().correctionMs).toBeNull();

		await recordSalesRequestGenerationOutcome(feedbackFixture.db, {
			actorUserId: 7,
			generationId: row().generationId,
			kind: "feedback",
			outcome: "accepted-with-edits",
			issueCategories: [],
			changedFieldCategories: ["line-items"],
			now: new Date("2026-09-12T12:04:00.000Z"),
		});
		expect(feedbackFixture.getRow().correctionMs).toBe(240_000);

		const saveFixture = dbFixture();
		await recordSalesRequestGenerationOutcome(saveFixture.db, {
			actorUserId: 7,
			generationId: row().generationId,
			kind: "apply",
			outcome: "applied",
			now,
		});
		await recordSalesRequestGenerationOutcome(saveFixture.db, {
			actorUserId: 7,
			generationId: row().generationId,
			kind: "save",
			stage: "draft",
			outcome: "saved",
			now: new Date("2026-09-12T12:02:00.000Z"),
		});
		expect(saveFixture.getRow().correctionMs).toBeNull();
	});

	test("enforces feedback phase and makes pre-Apply rejection terminal", async () => {
		const fixture = dbFixture();
		await expect(
			recordSalesRequestGenerationOutcome(fixture.db, {
				actorUserId: 7,
				generationId: row().generationId,
				kind: "feedback",
				outcome: "accepted",
				issueCategories: [],
				changedFieldCategories: [],
				now,
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });

		await recordSalesRequestGenerationOutcome(fixture.db, {
			actorUserId: 7,
			generationId: row().generationId,
			kind: "feedback",
			outcome: "rejected",
			issueCategories: ["unsafe-selection"],
			changedFieldCategories: [],
			now,
		});
		expect(fixture.getRow().correctionMs).toBeNull();
		await expect(
			recordSalesRequestGenerationOutcome(fixture.db, {
				actorUserId: 7,
				generationId: row().generationId,
				kind: "apply",
				outcome: "applied",
				now,
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });
	});

	test("rejects expired runs without revealing whether another actor owns them", async () => {
		const fixture = dbFixture({
			retentionUntil: new Date("2026-09-12T11:59:59.000Z"),
		});
		await expect(
			recordSalesRequestGenerationOutcome(fixture.db, {
				actorUserId: 7,
				generationId: row().generationId,
				kind: "feedback",
				outcome: "rejected",
				issueCategories: [],
				changedFieldCategories: [],
				now,
			}),
		).rejects.toBeInstanceOf(TRPCError);
	});

	test("purges expired rows and anonymizes rows on account deletion", async () => {
		const fixture = dbFixture();
		await purgeExpiredSalesRequestGenerationRuns(fixture.db, now);
		await anonymizeSalesRequestGenerationRunsForUser(fixture.db, 7);
		expect(fixture.calls.map((call) => call.method)).toEqual([
			"deleteMany",
			"updateMany",
		]);
		expect(fixture.calls[0]?.args).toMatchObject({
			where: { retentionUntil: { lte: now } },
		});
		expect(fixture.calls[1]?.args).toMatchObject({
			where: { actorUserId: 7, deletedAt: null },
			data: {
				actorUserId: null,
				seedDigest: null,
				consumedSalesId: null,
			},
		});
	});

	test("consumes a retained successful generation once and binds it to the Sales ID", async () => {
		const fixture = dbFixture();

		await expect(
			consumeSalesRequestGenerationRun(fixture.db, {
				actorUserId: 7,
				generationId: row().generationId,
				salesId: 41,
				now,
			}),
		).resolves.toEqual({ generationId: row().generationId, salesId: 41 });

		expect(fixture.getRow()).toMatchObject({ consumedSalesId: 41 });
		expect(fixture.calls.at(-1)).toMatchObject({
			method: "updateMany",
			args: {
				where: {
					generationId: row().generationId,
					actorUserId: 7,
					status: "succeeded",
					hasText: true,
					completedAt: { not: null },
					seedDigest: { not: null },
					deletedAt: null,
					retentionUntil: { gt: now },
					OR: [{ consumedSalesId: null }, { consumedSalesId: 41 }],
				},
				data: { consumedSalesId: 41 },
			},
		});
	});

	test("makes repeated consumption by the same Sales ID idempotent", async () => {
		const fixture = dbFixture(row({ consumedSalesId: 41 }));
		const input = {
			actorUserId: 7,
			generationId: row().generationId,
			salesId: 41,
			now,
		};

		await expect(
			consumeSalesRequestGenerationRun(fixture.db, input),
		).resolves.toEqual({ generationId: row().generationId, salesId: 41 });
		expect(fixture.getRow()).toMatchObject({ consumedSalesId: 41 });
	});

	test("rejects a competing Sales ID after the atomic consumption wins", async () => {
		const fixture = dbFixture();
		const input = {
			actorUserId: 7,
			generationId: row().generationId,
			now,
		};

		await consumeSalesRequestGenerationRun(fixture.db, {
			...input,
			salesId: 41,
		});
		await expect(
			consumeSalesRequestGenerationRun(fixture.db, {
				...input,
				salesId: 42,
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(fixture.getRow()).toMatchObject({ consumedSalesId: 41 });
	});

	test("allows one concurrent Sales binding winner and keeps same-ID retries idempotent", async () => {
		const fixture = dbFixture();
		const base = {
			actorUserId: 7,
			generationId: row().generationId,
			now,
		};
		const competing = await Promise.allSettled([
			consumeSalesRequestGenerationRun(fixture.db, { ...base, salesId: 41 }),
			consumeSalesRequestGenerationRun(fixture.db, { ...base, salesId: 42 }),
		]);

		expect(
			competing.filter((result) => result.status === "fulfilled"),
		).toHaveLength(1);
		expect(
			competing.filter((result) => result.status === "rejected"),
		).toHaveLength(1);
		const winner = fixture.getRow().consumedSalesId as number;
		await expect(
			Promise.all([
				consumeSalesRequestGenerationRun(fixture.db, {
					...base,
					salesId: winner,
				}),
				consumeSalesRequestGenerationRun(fixture.db, {
					...base,
					salesId: winner,
				}),
			]),
		).resolves.toEqual([
			{ generationId: row().generationId, salesId: winner },
			{ generationId: row().generationId, salesId: winner },
		]);
	});

	test("rejects late completion after consumption without mutating the run", async () => {
		const fixture = dbFixture();
		await consumeSalesRequestGenerationRun(fixture.db, {
			actorUserId: 7,
			generationId: row().generationId,
			salesId: 41,
			now,
		});
		const consumed = fixture.getRow();

		await expect(
			completeSalesRequestGenerationRun(fixture.db, {
				actorUserId: 7,
				generationId: row().generationId,
				status: "provider-error",
				completedAt: new Date("2026-09-12T12:01:00.000Z"),
				latencyMs: 99,
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(fixture.getRow()).toEqual(consumed);
	});

	test("fails closed for cross-actor, expired, deleted, non-success, and unbound runs", async () => {
		const cases = [
			{ actorUserId: 8 },
			{ retentionUntil: new Date("2026-09-12T12:00:00.000Z") },
			{ deletedAt: new Date("2026-09-12T11:00:00.000Z") },
			{ status: "failed" },
			{ hasText: false },
			{ completedAt: null },
			{ seedDigest: null },
		];

		for (const overrides of cases) {
			const inputActorUserId =
				typeof overrides.actorUserId === "number" ? overrides.actorUserId : 7;
			const fixture = dbFixture(
				row({
					...overrides,
					actorUserId: 7,
				}),
			);
			await expect(
				consumeSalesRequestGenerationRun(fixture.db, {
					actorUserId: inputActorUserId,
					generationId: row().generationId,
					salesId: 41,
					now,
				}),
			).rejects.toMatchObject({ code: "NOT_FOUND" });
			expect(fixture.getRow()).toMatchObject({ consumedSalesId: null });
		}
	});

	test("returns aggregate-only review evidence without claiming unsigned advancement", async () => {
		const fixture = dbFixture();
		const reviewNow = new Date("2026-09-13T00:00:00.000Z");
		const result = await getSalesRequestGenerationPilotSummary(fixture.db, {
			periodStart: "2026-09-06",
			now: reviewNow,
			authority: {
				scope: "sales-settings:7",
				configurationRevision: "a".repeat(64),
				provider: "openai",
				model: "gpt-5-mini",
				promptVersion: "new-sales-form-seed-v6",
				schemaVersion: 2,
				pilotSettingsRevision: 1,
				providerBenchmarkApprovalRevision: 1,
			},
		});
		expect(fixture.calls.at(-1)).toMatchObject({
			method: "findMany",
			args: {
				where: {
					startedAt: {
						gte: new Date("2026-09-06T00:00:00.000Z"),
						lt: new Date("2026-09-13T00:00:00.000Z"),
					},
					retentionUntil: { gt: reviewNow },
					deletedAt: null,
				},
				take: 10_001,
				select: { latencyMs: true },
			},
		});
		expect(result).toHaveProperty("metrics.generationCount", 1);
		expect(result).toHaveProperty("eligibleForAdvancement", false);
		expect(result).toHaveProperty(
			"evidence.reviewability.status",
			"reviewable",
		);
		expect(result).toHaveProperty(
			"evidence.advancement.status",
			"not-evaluable",
		);
		expect(result).toHaveProperty("evidence.coverage.feedback.complete", false);
		expect(result).toHaveProperty("authority.status", "matched");
		expect(result).toHaveProperty("authority.identity.provider", "openai");
		expect(result).not.toHaveProperty("runs");
		expect(JSON.stringify(result)).not.toMatch(
			/generationId|actorUserId|sourceText|providerBody|seedDigest/,
		);
	});

	test("does not query or aggregate an open review period", async () => {
		const fixture = dbFixture();
		const result = await getSalesRequestGenerationPilotSummary(fixture.db, {
			periodStart: "2026-09-12",
			now,
		});

		expect(fixture.calls).toHaveLength(0);
		expect(result).toMatchObject({
			coverage: { complete: false, truncated: false, returnedRowCount: 0 },
			authority: { status: "blocked", blockers: ["period-open"] },
			metrics: null,
		});
	});

	test("keeps mixed-authority metrics reviewable but blocks advancement", async () => {
		const fixture = dbFixture(row({ pilotSettingsRevision: 2 }));
		const result = await getSalesRequestGenerationPilotSummary(fixture.db, {
			periodStart: "2026-09-06",
			now: new Date("2026-09-13T00:00:00.000Z"),
			authority: {
				scope: "sales-settings:7",
				configurationRevision: "a".repeat(64),
				provider: "openai",
				model: "gpt-5-mini",
				promptVersion: "new-sales-form-seed-v6",
				schemaVersion: 2,
				pilotSettingsRevision: 1,
				providerBenchmarkApprovalRevision: 1,
			},
		});

		expect(result).toMatchObject({
			coverage: { complete: true, truncated: false, returnedRowCount: 1 },
			eligibleForAdvancement: false,
			authority: {
				status: "blocked",
				blockers: ["pilot-settings-revision-mismatch"],
			},
			metrics: { generationCount: 1 },
		});
	});

	test("keeps a closed period reviewable after the pilot is disabled", async () => {
		const fixture = dbFixture();
		const result = await getSalesRequestGenerationPilotSummary(fixture.db, {
			periodStart: "2026-09-06",
			now: new Date("2026-09-13T00:00:00.000Z"),
			authority: null,
			authorityBlockers: ["pilot-disabled"],
		});

		expect(result).toMatchObject({
			coverage: { complete: true, truncated: false, returnedRowCount: 1 },
			eligibleForAdvancement: false,
			authority: {
				status: "blocked",
				blockers: ["pilot-disabled"],
				identity: { pilotSettingsRevision: 1 },
			},
			metrics: { generationCount: 1 },
		});
	});

	test("fails closed instead of aggregating beyond the report row limit", async () => {
		const overflowDb = {
			salesRequestGenerationRun: {
				findMany: async () => Array.from({ length: 10_001 }, () => row()),
			},
		} as unknown as Parameters<typeof getSalesRequestGenerationPilotSummary>[0];
		const result = await getSalesRequestGenerationPilotSummary(overflowDb, {
			periodStart: "2026-09-06",
			now: new Date("2026-09-13T00:00:00.000Z"),
		});

		expect(result).toMatchObject({
			coverage: {
				complete: false,
				truncated: true,
				returnedRowCount: 10_001,
			},
			authority: {
				status: "blocked",
				blockers: ["row-limit-exceeded"],
			},
			metrics: null,
		});
	});
});
