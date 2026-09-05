import { describe, expect, it } from "bun:test";

import {
	buildSalesPipelineReconciliationEvidence,
	buildSalesPipelineReconciliationOrderWhere,
	isRetryableDatabaseConnectionError,
	restoreProjectionDates,
	restoreSalesPipelineProjectionRecord,
	withDatabaseReadRetry,
	withDeterministicProjectionRepairRetry,
} from "./sales-pipeline-reconcile";

const source = await Bun.file(
	new URL("./sales-pipeline-reconcile.ts", import.meta.url),
).text();
const retrySource = await Bun.file(
	new URL("./sales-pipeline-database-retry.ts", import.meta.url),
).text();

describe("Sales Pipeline reconciliation rollback", () => {
	it("builds an exact order discovery predicate for split and equals flag syntax", () => {
		expect(buildSalesPipelineReconciliationOrderWhere(["--order-id", "20780"])).toEqual({
			type: "order", deletedAt: null, id: 20780,
		});
		expect(buildSalesPipelineReconciliationOrderWhere(["--order-id=20780"])).toEqual({
			type: "order", deletedAt: null, id: 20780,
		});
		expect(buildSalesPipelineReconciliationOrderWhere([])).toEqual({
			type: "order", deletedAt: null,
		});
	});
	it.each(["", "0", "-1", "1.5", "1,2", "abc", "Infinity", "9007199254740992"])(
		"rejects invalid order scope %s instead of broadening the repair", (value) => {
			expect(() => buildSalesPipelineReconciliationOrderWhere(["--order-id", value])).toThrow("--order-id must be a positive safe integer");
			expect(() => buildSalesPipelineReconciliationOrderWhere([`--order-id=${value}`])).toThrow("--order-id must be a positive safe integer");
		},
	);
	it.each([
		["--order-id"], ["--order-id", "--apply"],
		["--order-id", "1", "--order-id=2"], ["--order-id=1", "--order-id=2"],
		["--order-id", "20780", "--undo-run", "backup.json"],
		["--order-id=20780", "--undo-run=backup.json"],
	].map((argv) => ({ argv })))("rejects missing, duplicate, or incompatible order scopes %j", ({ argv }) => {
		expect(() => buildSalesPipelineReconciliationOrderWhere(argv)).toThrow("--order-id");
	});
	it.each([false, true])("exits after successful final cleanup even with a retired driver handle (command failed: %s)", async (fails) => {
		const modulePath = new URL("./sales-pipeline-database-retry.ts", import.meta.url).pathname;
		const child = Bun.spawn([process.execPath, "-e", `
			import { runDatabaseCli } from ${JSON.stringify(modulePath)};
			await runDatabaseCli(async () => {
				setInterval(() => {}, 100);
				process.stdout.write("REPORT_SAVED\\n");
				if (${fails}) throw new Error("command failed");
			}, async () => { process.stdout.write("FINAL_CLEANUP_SUCCEEDED\\n"); }, 5);
		`], { stdout: "pipe", stderr: "pipe" });
		const guard = setTimeout(() => child.kill(), 1_000);
		try {
			const [code, stdout] = await Promise.all([child.exited, new Response(child.stdout).text()]);
			expect(code).toBe(fails ? 1 : 0);
			expect(stdout).toContain("REPORT_SAVED");
			expect(stdout).toContain("FINAL_CLEANUP_SUCCEEDED");
		} finally { clearTimeout(guard); }
	});

	it("bounds terminal cleanup only after the command and its report have settled", async () => {
		const modulePath = new URL("./sales-pipeline-database-retry.ts", import.meta.url).pathname;
		const child = Bun.spawn([process.execPath, "-e", `
			import { runDatabaseCli } from ${JSON.stringify(modulePath)};
			await runDatabaseCli(async () => {
				await Bun.sleep(40);
				process.stdout.write("REPORT_SAVED_AFTER_WRITE_SETTLED\\n");
			}, async () => {
				setInterval(() => {}, 100);
				await new Promise(() => {});
			}, 5);
		`], { stdout: "pipe", stderr: "pipe" });
		const guard = setTimeout(() => child.kill(), 1_000);
		try {
			const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
			expect(code).toBe(1);
			expect(stdout).toContain("REPORT_SAVED_AFTER_WRITE_SETTLED");
			expect(stderr).toContain("Database cleanup timed out");
		} finally {
			clearTimeout(guard);
		}
	});

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

	it("surfaces unsafe and repairable samples independently of source ordering", () => {
		const evidence = buildSalesPipelineReconciliationEvidence(
			[
				{
					id: 1,
					category: "known_compatibility_difference" as const,
					reasons: ["LEGACY_DRIFT"],
				},
				{
					id: 2,
					category: "unsafe" as const,
					reasons: ["UNSAFE_TRANSITION"],
				},
				{
					id: 3,
					category: "deterministic_repair" as const,
					reasons: ["STALE_PROJECTION"],
				},
			],
			1,
		);

		expect(evidence.reasonCounts).toEqual({
			LEGACY_DRIFT: 1,
			STALE_PROJECTION: 1,
			UNSAFE_TRANSITION: 1,
		});
		expect(evidence.samplesByCategory.unsafe).toEqual([
			expect.objectContaining({ id: 2 }),
		]);
		expect(evidence.samplesByCategory.deterministic_repair).toEqual([
			expect.objectContaining({ id: 3 }),
		]);
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
		expect(isRetryableDatabaseConnectionError({ code: "P2024" })).toBe(true);
		expect(
			isRetryableDatabaseConnectionError(
				new Error(
					"Timed out fetching a new connection from the connection pool",
				),
			),
		).toBe(true);
		expect(
			isRetryableDatabaseConnectionError(
				new Error("Response from the Engine was empty"),
			),
		).toBe(true);
		expect(
			isRetryableDatabaseConnectionError(
				new Error("Engine is not yet connected."),
			),
		).toBe(true);
		expect(isRetryableDatabaseConnectionError(new Error("invalid input"))).toBe(
			false,
		);
	});

	it("times out a hung read attempt and retries with a fresh attempt", async () => {
		let attempts = 0;
		let retries = 0;
		const result = await withDatabaseReadRetry(
			async () => {
				attempts += 1;
				if (attempts === 1) {
					return await new Promise<string>(() => undefined);
				}
				return "recovered";
			},
			{
				attempts: 2,
				delayMs: 0,
				attemptTimeoutMs: 5,
				onRetry: () => {
					retries += 1;
				},
			},
		);

		expect(result).toBe("recovered");
		expect(attempts).toBe(2);
		expect(retries).toBe(1);
	});

	it("allows a production connection recovery window for read phases", () => {
		expect(retrySource).toContain("options.attempts ?? 20");
		expect(retrySource).toContain("options.delayMs ?? 5_000");
		expect(retrySource).toContain("options.attemptTimeoutMs ?? 30_000");
		expect(source).toContain("runRead: withProductionDatabaseReadRetry");
		expect(source).toContain("serializeReads: true");
		expect(source).toContain("onRetry: resetProductionDatabaseConnection");
	});

	it("fails closed when cleanup never settles rather than hanging or starting another read", async () => {
		let attempts = 0;
		await expect(
			withDatabaseReadRetry(
				async () => {
					attempts += 1;
					throw Object.assign(new Error("Connection lost"), { code: "P1017" });
				},
				{
					attempts: 3,
					delayMs: 0,
					attemptTimeoutMs: 5,
					onRetry: () => new Promise<void>(() => undefined),
				},
			),
		).rejects.toMatchObject({ code: "GND_DATABASE_READ_TIMEOUT" });
		expect(attempts).toBe(1);
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

	it("waits for a slow projection write instead of timing it out and overlapping a retry", async () => {
		let writes = 0;
		let retries = 0;
		const result = await withDeterministicProjectionRepairRetry(
			async () => {
				writes += 1;
				await new Promise((resolve) => setTimeout(resolve, 30));
				return "persisted";
			},
			{
				attempts: 2,
				delayMs: 0,
				attemptTimeoutMs: 5,
				onRetry: () => {
					retries += 1;
				},
			},
		);

		expect(result).toBe("persisted");
		expect(writes).toBe(1);
		expect(retries).toBe(0);
	});

	it("does not restart a projection batch on an unacknowledged read deadline", async () => {
		const failure = Object.assign(new Error("Read deadline expired"), {
			code: "GND_DATABASE_READ_TIMEOUT",
		});
		let attempts = 0;
		await expect(
			withDeterministicProjectionRepairRetry(
				async () => {
					attempts += 1;
					throw failure;
				},
				{ attempts: 2, delayMs: 0 },
			),
		).rejects.toBe(failure);
		expect(attempts).toBe(1);
	});
});
