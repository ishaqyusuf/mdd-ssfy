import { describe, expect, test } from "bun:test";
import { listSalesRequestFinalSaveExceptions } from "./sales-request-exceptions";

const now = new Date("2026-09-13T18:00:00.000Z");

function exceptionRow(overrides: Record<string, unknown> = {}) {
	return {
		generationId: "11111111-1111-4111-8111-111111111111",
		actorUserId: 7,
		status: "succeeded",
		hasText: true,
		applyOutcome: "applied",
		saveFinalOutcome: "failed",
		saveFinalAt: new Date("2026-09-13T17:00:00.000Z"),
		retentionUntil: new Date("2026-12-12T17:00:00.000Z"),
		deletedAt: null,
		...overrides,
	};
}

describe("sales request final-save exception queue", () => {
	test("returns only the actor's retained unresolved pasted-text failures with bounded fields", async () => {
		let args: Record<string, unknown> | null = null;
		const rows = [
			exceptionRow(),
			exceptionRow({
				generationId: "22222222-2222-4222-8222-222222222222",
				actorUserId: 8,
			}),
			exceptionRow({
				generationId: "33333333-3333-4333-8333-333333333333",
				retentionUntil: now,
			}),
			exceptionRow({
				generationId: "44444444-4444-4444-8444-444444444444",
				deletedAt: new Date("2026-09-13T17:30:00.000Z"),
			}),
			exceptionRow({
				generationId: "55555555-5555-4555-8555-555555555555",
				saveFinalOutcome: "saved",
			}),
			exceptionRow({
				generationId: "66666666-6666-4666-8666-666666666666",
				hasText: false,
			}),
		];
		const db = {
			salesRequestGenerationRun: {
				findMany: async (input: Record<string, unknown>) => {
					args = input;
					const where = input.where as Record<string, unknown>;
					return rows.filter(
						(row) =>
							row.actorUserId === where.actorUserId &&
							row.status === where.status &&
							row.hasText === where.hasText &&
							row.applyOutcome === where.applyOutcome &&
							row.saveFinalOutcome === where.saveFinalOutcome &&
							row.deletedAt === null &&
							row.retentionUntil > (where.retentionUntil as { gt: Date }).gt,
					);
				},
			},
		};

		const result = await listSalesRequestFinalSaveExceptions(db, {
			actorUserId: 7,
			limit: 25,
			now,
		});

		expect(result).toEqual({
			items: [
				{
					generationId: "11111111-1111-4111-8111-111111111111",
					kind: "final-save-failed",
					failedAt: new Date("2026-09-13T17:00:00.000Z"),
					retentionUntil: new Date("2026-12-12T17:00:00.000Z"),
				},
			],
			truncated: false,
		});
		expect(args).toMatchObject({
			where: {
				actorUserId: 7,
				status: "succeeded",
				hasText: true,
				applyOutcome: "applied",
				saveFinalOutcome: "failed",
				deletedAt: null,
				retentionUntil: { gt: now },
			},
			orderBy: [{ saveFinalAt: "desc" }, { generationId: "desc" }],
			take: 26,
			select: {
				generationId: true,
				saveFinalAt: true,
				retentionUntil: true,
			},
		});
		expect(JSON.stringify(result)).not.toMatch(
			/source|text|seed|provider|contact|address|price|amount|customer|salesId/i,
		);
	});

	test("caps the queue and reports truncation without returning an extra row", async () => {
		const db = {
			salesRequestGenerationRun: {
				findMany: async () => [
					exceptionRow(),
					exceptionRow({
						generationId: "22222222-2222-4222-8222-222222222222",
					}),
				],
			},
		};
		const result = await listSalesRequestFinalSaveExceptions(db, {
			actorUserId: 7,
			limit: 1,
			now,
		});
		expect(result.items).toHaveLength(1);
		expect(result.truncated).toBe(true);
	});
});
