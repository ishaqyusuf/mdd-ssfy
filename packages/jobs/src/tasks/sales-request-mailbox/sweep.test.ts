import { describe, expect, test } from "bun:test";
import { createSalesRequestMailboxSweep } from "./sweep";

describe("Sales Request mailbox sweep", () => {
	test("dispatches only opaque work references with deterministic keys", async () => {
		const calls: unknown[] = [];
		const now = new Date("2026-09-13T18:00:00.000Z");
		const sweep = createSalesRequestMailboxSweep({
			findDueWork: async () => ({
				syncWorkIds: ["stream-1"],
				detailWorkIds: ["summary-1"],
				tokenHealthWorkIds: ["health-1"],
				disconnectWorkIds: ["disconnect-1"],
			}),
			dispatch: async (input) => calls.push(input),
			clock: () => now,
		});

		await expect(sweep()).resolves.toEqual({
			sync: 1,
			detail: 1,
			tokenHealth: 1,
			disconnect: 1,
		});
		expect(calls).toEqual([
			{
				kind: "sync",
				payload: { workId: "stream-1" },
				idempotencyKey: "sales-request-mailbox:sync:stream-1",
			},
			{
				kind: "detail",
				payload: { workId: "summary-1" },
				idempotencyKey: "sales-request-mailbox:detail:summary-1",
			},
			{
				kind: "token-health",
				payload: { workId: "health-1" },
				idempotencyKey: "sales-request-mailbox:token-health:health-1",
			},
			{
				kind: "disconnect",
				payload: { workId: "disconnect-1" },
				idempotencyKey: "sales-request-mailbox:disconnect:disconnect-1",
			},
		]);
	});

	test("fails closed on an invalid store result", async () => {
		const sweep = createSalesRequestMailboxSweep({
			findDueWork: async () => ({
				syncWorkIds: ["contains\ncontrol"],
				detailWorkIds: [],
				tokenHealthWorkIds: [],
				disconnectWorkIds: [],
			}),
			dispatch: async () => undefined,
		});
		await expect(sweep()).rejects.toThrow();
	});
});
