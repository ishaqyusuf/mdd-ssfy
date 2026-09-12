import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";
import {
	anonymizeSalesRequestGenerationRunsForUser,
	completeSalesRequestGenerationRun,
	createSalesRequestGenerationRun,
	getSalesRequestGenerationPilotSummary,
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
		status: "succeeded",
		hasText: true,
		latencyMs: 800,
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
				const field = Object.keys(where).find((key) =>
					[
						"applyOutcome",
						"saveDraftOutcome",
						"saveFinalOutcome",
						"feedbackOutcome",
					].includes(key),
				);
				if (field && current[field] != null) return { count: 0 };
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
			hasText: true,
			startedAt: now,
		});

		const createArgs = fixture.calls[0]?.args as {
			data: Record<string, unknown>;
		};
		expect(createArgs.data).toMatchObject({
			generationId: "22222222-2222-4222-8222-222222222222",
			actorUserId: 7,
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
			provider: "openai",
			model: "gpt-5-mini",
			promptVersion: "new-sales-form-seed-v6",
			schemaVersion: 2,
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
				}),
			},
		});
		expect(JSON.stringify(fixture.calls.at(-1))).not.toMatch(
			/source|private|error.*body/i,
		);
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
			data: { actorUserId: null },
		});
	});

	test("returns aggregate-only Super Admin report inputs", async () => {
		const fixture = dbFixture();
		const result = await getSalesRequestGenerationPilotSummary(fixture.db, {
			days: 30,
			now,
		});
		expect(fixture.calls.at(-1)).toMatchObject({
			method: "findMany",
			args: { where: { retentionUntil: { gt: now }, deletedAt: null } },
		});
		expect(result).toHaveProperty("generationCount", 1);
		expect(result).not.toHaveProperty("runs");
		expect(JSON.stringify(result)).not.toMatch(
			/generationId|actorUserId|configurationRevision/,
		);
	});
});
