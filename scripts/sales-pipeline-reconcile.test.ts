import { describe, expect, it } from "bun:test";

import {
	isRetryableDatabaseConnectionError,
	restoreProjectionDates,
	restoreSalesPipelineProjectionRecord,
	withDatabaseReadRetry,
	withDeterministicProjectionRepairRetry,
} from "./sales-pipeline-reconcile";

const source = await Bun.file(
	new URL("./sales-pipeline-reconcile.ts", import.meta.url),
).text();

describe("Sales Pipeline reconciliation rollback", () => {
	it("restores only when the projection still has the repair revision", async () => {
		const calls: unknown[] = [];
		const result = await restoreSalesPipelineProjectionRecord(
			{
				deleteMany: async () => ({ count: 0 }),
				updateMany: async (input) => {
					calls.push(input);
					return { count: 1 };
				},
			},
			{
				salesOrderId: 42,
				postPipelineRevision: "repair-revision",
				previous: {
					id: 9,
					salesOrderId: 42,
					createdAt: "2026-09-01T00:00:00.000Z",
					updatedAt: "2026-09-01T00:00:00.000Z",
					projectedAt: "2026-09-01T01:00:00.000Z",
					pipelineRevision: "previous-revision",
				},
			},
		);

		expect(result).toBe("restored");
		expect(calls).toEqual([
			{
				where: {
					salesOrderId: 42,
					pipelineRevision: "repair-revision",
				},
				data: {
					projectedAt: new Date("2026-09-01T01:00:00.000Z"),
					pipelineRevision: "previous-revision",
				},
			},
		]);
	});

	it("skips rollback after a newer projection revision wins", async () => {
		const result = await restoreSalesPipelineProjectionRecord(
			{
				deleteMany: async () => ({ count: 0 }),
				updateMany: async () => ({ count: 0 }),
			},
			{
				salesOrderId: 42,
				postPipelineRevision: "old-repair-revision",
				previous: { pipelineRevision: "previous-revision" },
			},
		);

		expect(result).toBe("skipped_as_changed");
	});

	it("restores serialized projection dates without changing other fields", () => {
		expect(
			restoreProjectionDates({
				projectedAt: "2026-09-01T01:00:00.000Z",
				pipelineHeadline: "production_scheduled",
			}),
		).toEqual({
			projectedAt: new Date("2026-09-01T01:00:00.000Z"),
			pipelineHeadline: "production_scheduled",
		});
	});

	it("writes operational reports directly without relying on shell pipelines", () => {
		expect(source).toContain('const outputPath = valueAfter("--output")');
		expect(source).toContain(
			'if (outputPath) await writeFile(resolve(outputPath), serialized, "utf8")',
		);
	});

	it("serializes production permission checks to avoid connection bursts", () => {
		expect(source).not.toContain(
			"const [canEditProduction, canFulfill] = await Promise.all",
		);
		expect(source).toContain("const canFulfill = canEditProduction");
		expect(source).toContain(
			'userHasPermission(db, actorId, "editProduction")',
		);
		expect(source).toContain(
			'userHasPermission(db, actorId, "viewMarkSalesOrderFulfilled")',
		);
	});

	it("retries transient production reads without retrying other failures", async () => {
		let attempts = 0;
		let resets = 0;
		const result = await withDatabaseReadRetry(
			async () => {
				attempts += 1;
				if (attempts < 3) {
					throw Object.assign(new Error("Can't reach database server"), {
						code: "P1001",
					});
				}
				return "connected";
			},
			{
				attempts: 3,
				delayMs: 0,
				onRetry: async () => {
					resets += 1;
				},
			},
		);

		expect(result).toBe("connected");
		expect(attempts).toBe(3);
		expect(resets).toBe(2);
		expect(isRetryableDatabaseConnectionError({ code: "P1001" })).toBe(true);
		expect(isRetryableDatabaseConnectionError(new Error("invalid input"))).toBe(
			false,
		);
	});

	it("allows a production connection recovery window for read phases", () => {
		expect(source).toContain("options.attempts ?? 20");
		expect(source).toContain("options.delayMs ?? 5_000");
		expect(source).toContain("runRead: withProductionDatabaseReadRetry");
		expect(source).toContain("serializeReads: true");
		expect(source).toContain("onRetry: resetProductionDatabaseConnection");
	});

	it("recomputes a deterministic projection batch after an unacknowledged connection failure", async () => {
		let attempts = 0;
		const result = await withDeterministicProjectionRepairRetry(
			async () => {
				attempts += 1;
				if (attempts === 1) {
					throw Object.assign(new Error("Server has closed the connection"), {
						code: "P1017",
					});
				}
				return "converged";
			},
			{ attempts: 2, delayMs: 0 },
		);

		expect(result).toBe("converged");
		expect(attempts).toBe(2);
	});
});
