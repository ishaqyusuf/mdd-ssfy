import { describe, expect, test } from "bun:test";

import {
	evaluateAssistantQuotaUsage,
	reserveAssistantQuota,
	resolveAssistantQuotaWindows,
	settleAssistantQuotaReservationFallback,
} from "./assistant-quota";

const now = new Date("2026-09-14T10:30:00.000Z");

function policy(overrides: Record<string, unknown> = {}) {
	return {
		id: "policy-1",
		name: "Standard",
		kind: "user",
		dailyRequestLimit: 10,
		monthlyRequestLimit: 100,
		dailyTokenLimit: 100_000n,
		monthlyTokenLimit: 1_000_000n,
		concurrentRunLimit: 2,
		dailyCostLimitMicros: null,
		monthlyCostLimitMicros: null,
		warningPercent: 80,
		timezone: "Africa/Lagos",
		enforcementMode: "hard",
		effectiveFrom: new Date("2026-09-01T00:00:00.000Z"),
		effectiveTo: null,
		version: 1,
		...overrides,
	};
}

function reservation(overrides: Record<string, unknown> = {}) {
	return {
		status: "settled",
		requestUnits: 1,
		reservedTokens: 1_000n,
		reservedCostMicros: 0n,
		actualTokens: 800n,
		actualCostMicros: 0n,
		dayWindowStart: new Date("2026-09-13T23:00:00.000Z"),
		monthWindowStart: new Date("2026-08-31T23:00:00.000Z"),
		expiresAt: new Date("2026-09-14T10:00:00.000Z"),
		...overrides,
	};
}

function reservationDatabase(
	row: Record<string, unknown>,
	runStatus: string,
) {
	return {
		$transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
			operation({
				assistantQuotaReservation: {
					findUnique: async () => row,
				},
				assistantRun: {
					findFirst: async () => ({ status: runStatus }),
				},
			}),
	};
}

describe("assistant quota evaluation", () => {
	test("uses the policy timezone for daily and monthly reset windows", () => {
		const windows = resolveAssistantQuotaWindows(now, "Africa/Lagos");

		expect(windows.dayStart.toISOString()).toBe("2026-09-13T23:00:00.000Z");
		expect(windows.dayEnd.toISOString()).toBe("2026-09-14T23:00:00.000Z");
		expect(windows.monthStart.toISOString()).toBe("2026-08-31T23:00:00.000Z");
		expect(windows.monthEnd.toISOString()).toBe("2026-09-30T23:00:00.000Z");
	});

	test("treats a missing policy as unlimited", () => {
		const result = evaluateAssistantQuotaUsage({
			policy: null,
			reservations: [],
			now,
		});

		expect(result.configured).toBe(false);
		expect(result.exceeded).toBe(false);
		expect(result.remaining).toEqual({
			requests: null,
			tokens: null,
			concurrentRuns: null,
		});
	});

	test("warns when settled usage reaches the configured threshold", () => {
		const reservations = Array.from({ length: 8 }, () => reservation());
		const result = evaluateAssistantQuotaUsage({
			policy: policy(),
			reservations,
			now,
		});

		expect(result.warning).toBe(true);
		expect(result.exceeded).toBe(false);
		expect(result.used.dailyRequests).toBe(8);
		expect(result.remaining.requests).toBe(2);
	});

	test("detects a projected request and concurrency limit before execution", () => {
		const reservations = [
			reservation({
				status: "reserved",
				expiresAt: new Date("2026-09-14T10:31:00.000Z"),
			}),
		];
		const result = evaluateAssistantQuotaUsage({
			policy: policy({ dailyRequestLimit: 1, concurrentRunLimit: 1 }),
			reservations,
			now,
			reserveRequests: 1,
		});

		expect(result.exceeded).toBe(true);
		expect(result.exceededDimension).toBe("daily_requests");
	});

	test("released cancellation reservations do not consume allowance", () => {
		const result = evaluateAssistantQuotaUsage({
			policy: policy({ dailyRequestLimit: 1, dailyTokenLimit: 1_000n }),
			reservations: [
				reservation({
					status: "released",
					actualTokens: 0n,
					dayWindowStart: new Date("2026-09-13T23:00:00.000Z"),
				}),
			],
			now,
		});

		expect(result.exceeded).toBe(false);
		expect(result.used.dailyRequests).toBe(0);
		expect(result.used.dailyTokens).toBe(0);
	});
});

test("fallback finalization preserves explicit pre-provider release", async () => {
	const calls: unknown[] = [];
	const database = {
		assistantQuotaReservation: {
			updateMany: async (input: unknown) => {
				calls.push(input);
				return { count: 1 };
			},
		},
	};
	await settleAssistantQuotaReservationFallback(database as never, {
		runId: "run-before-provider",
		release: true,
		now,
	});
	expect(calls[0]).toEqual({
		where: { runId: "run-before-provider", status: "reserved" },
		data: {
			status: "released",
			actualTokens: 0n,
			actualCostMicros: 0n,
			settledAt: now,
		},
	});
});

test("does not replay expired or released reservations for active runs", async () => {
	for (const status of ["expired", "released"]) {
		await expect(
			reserveAssistantQuota(
				reservationDatabase(
					reservation({
						status,
						expiresAt: new Date("2026-09-14T10:00:00.000Z"),
					}),
					"queued",
				) as never,
				{
					runId: `run-${status}`,
					actorUserId: 42,
					scopeType: "user",
					scopeId: "42",
					modelIdentity: "openai:gpt-5",
					now,
				},
			),
		).rejects.toMatchObject({ code: "ASSISTANT_QUOTA_UNAVAILABLE" });
	}
});

test("allows terminal-run replay without reviving its stale reservation", async () => {
	const stale = reservation({
		status: "released",
		expiresAt: new Date("2026-09-14T10:00:00.000Z"),
	});
	const result = await reserveAssistantQuota(
		reservationDatabase(stale, "succeeded") as never,
		{
			runId: "run-complete",
			actorUserId: 42,
			scopeType: "user",
			scopeId: "42",
			modelIdentity: "openai:gpt-5",
			now,
		},
	);
	expect(result).toBe(stale);
});
