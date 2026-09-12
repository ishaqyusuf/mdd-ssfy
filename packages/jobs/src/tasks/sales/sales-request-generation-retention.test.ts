import { describe, expect, test } from "bun:test";
import {
	SALES_REQUEST_GENERATION_RETENTION_CRON,
	SALES_REQUEST_GENERATION_RETENTION_TASK_ID,
	runSalesRequestGenerationRetentionPurge,
} from "./sales-request-generation-retention";

describe("Sales Request Generation telemetry retention", () => {
	test("registers one daily UTC purge", () => {
		expect(SALES_REQUEST_GENERATION_RETENTION_TASK_ID).toBe(
			"sales-request-generation-retention-purge",
		);
		expect(SALES_REQUEST_GENERATION_RETENTION_CRON).toEqual({
			pattern: "17 2 * * *",
			timezone: "UTC",
		});
	});

	test("purges every row at or past its server-owned retention deadline", async () => {
		const now = new Date("2026-12-11T12:00:00.000Z");
		const calls: unknown[] = [];
		const database = {
			salesRequestGenerationRun: {
				deleteMany: async (args: unknown) => {
					calls.push(args);
					return { count: 4 };
				},
			},
		};

		await expect(
			runSalesRequestGenerationRetentionPurge(database, now),
		).resolves.toEqual({ purgedCount: 4, retentionDays: 90 });
		expect(calls).toEqual([{ where: { retentionUntil: { lte: now } } }]);
		expect(JSON.stringify(calls)).not.toMatch(
			/actorUserId|generationId|sourceText|providerBody|contact/i,
		);
	});
});
