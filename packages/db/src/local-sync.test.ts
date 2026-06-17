// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	assertSafeConnections,
	buildCursorExpression,
	buildDuplicateSkipReason,
	buildCursorWhereClause,
	buildKeysetWhereClause,
	buildUpsertSql,
	buildUpsertValues,
	classifyTable,
	isDuplicateKeyError,
	parseArgs,
	parseEnvFile,
	quoteIdent,
	recoverFromDuplicateConflict,
	resetLocalTable,
	resolveOptions,
	type DuplicateConflictContext,
	type SyncOptions,
	type SyncState,
	type TableManifest,
} from "./local-sync";

describe("local db sync helpers", () => {
	test("quotes MySQL identifiers", () => {
		expect(quoteIdent("SalesOrders")).toBe("`SalesOrders`");
		expect(quoteIdent("bad`name")).toBe("`bad``name`");
	});

	test("classifies updatedAt tables as incremental", () => {
		expect(
			classifyTable({
				table: "SalesOrders",
				columns: ["id", "createdAt", "updatedAt", "deletedAt"],
				keyColumns: ["id"],
				refreshStatic: false,
			}),
		).toMatchObject({
			mode: "incremental",
			cursorColumns: ["updatedAt", "createdAt"],
		});
	});

	test("classifies createdAt-only tables as insert-only", () => {
		expect(
			classifyTable({
				table: "PageView",
				columns: ["id", "createdAt"],
				keyColumns: ["id"],
				refreshStatic: false,
			}),
		).toMatchObject({
			mode: "insert-only",
			cursorColumns: ["createdAt"],
		});
	});

	test("skips tables without keys", () => {
		expect(
			classifyTable({
				table: "NoKey",
				columns: ["createdAt", "updatedAt"],
				keyColumns: [],
				refreshStatic: true,
			}),
		).toMatchObject({
			mode: "skip",
			reason: "No primary or unique key was detected.",
		});
	});

	test("builds deterministic cursor where clause with composite keys", () => {
		const where = buildCursorWhereClause(buildCursorExpression(["updatedAt", "createdAt"]), ["a", "b"], {
			cursorValue: "2026-05-19 12:00:00.000",
			keyValues: { a: 7, b: "x" },
			cursorColumns: ["updatedAt", "createdAt"],
			mode: "incremental",
			syncedAt: "2026-05-19T12:00:00.000Z",
		});

		expect(where.sql).toContain("COALESCE(`updatedAt`, `createdAt`, '1000-01-01 00:00:00.000') > ?");
		expect(where.sql).toContain("`a` > ?");
		expect(where.sql).toContain("`a` = ? AND `b` > ?");
		expect(where.params).toEqual(["2026-05-19 12:00:00.000", "2026-05-19 12:00:00.000", 7, 7, "x"]);
	});

	test("builds deterministic keyset where clause with composite keys", () => {
		const where = buildKeysetWhereClause(["a", "b"], { a: 7, b: "x" });

		expect(where.sql).toBe("WHERE ((`a` > ?) OR (`a` = ? AND `b` > ?))");
		expect(where.params).toEqual([7, 7, "x"]);
	});

	test("keeps cursor floor on keyset fallback scans", () => {
		const where = buildKeysetWhereClause(
			["a", "b"],
			{ a: 7, b: "x" },
			buildCursorExpression(["updatedAt", "createdAt"]),
			"2026-05-04 23:59:59.999",
		);

		expect(where.sql).toBe(
			"WHERE COALESCE(`updatedAt`, `createdAt`, '1000-01-01 00:00:00.000') > ? AND ((`a` > ?) OR (`a` = ? AND `b` > ?))",
		);
		expect(where.params).toEqual(["2026-05-04 23:59:59.999", 7, 7, "x"]);
	});

	test("builds multi-row upsert SQL", () => {
		expect(buildUpsertSql("Users", ["id", "name", "updatedAt"], ["id"], 2)).toBe(
			"INSERT INTO `Users` (`id`, `name`, `updatedAt`) VALUES (?, ?, ?), (?, ?, ?) ON DUPLICATE KEY UPDATE `id` = VALUES(`id`), `name` = VALUES(`name`), `updatedAt` = VALUES(`updatedAt`)",
		);
	});

	test("serializes JSON values before raw MySQL upserts", () => {
		const createdAt = new Date("2026-05-25T12:00:00.000Z");
		const bytes = new Uint8Array([1, 2, 3]);

		expect(
			buildUpsertValues(["id", "tags", "settings", "createdAt", "bytes"], [
				{
					id: 1,
					tags: ["builder", "vip"],
					settings: { alerts: true },
					createdAt,
					bytes,
				},
			]),
		).toEqual([1, '["builder","vip"]', '{"alerts":true}', createdAt, bytes]);
	});

	test("rejects unsafe target connections", () => {
		expect(() =>
			assertSafeConnections("mysql://user:pass@aws.connect.psdb.cloud/gndprodesk", "mysql://root@aws.connect.psdb.cloud/gndprodesk"),
		).toThrow("same database");
		expect(() =>
			assertSafeConnections("mysql://user:pass@aws.connect.psdb.cloud/gndprodesk", "mysql://root@example.com/gndprodesk"),
		).toThrow("non-local target");
		expect(() =>
			assertSafeConnections("mysql://user:pass@aws.connect.psdb.cloud/gndprodesk", "mysql://root@127.0.0.1:3307/gnd-prisma2"),
		).not.toThrow();
	});

	test("parses cli args and env files", () => {
		expect(parseArgs(["--dry-run", "--table", "Users", "--read-batch-size", "250"])).toMatchObject({
			dryRun: true,
			table: "Users",
			readBatchSize: 250,
		});
		expect(parseArgs(["--initial-cursor-value", "2026-05-04 23:59:59.999"])).toMatchObject({
			initialCursorValue: "2026-05-04 23:59:59.999",
		});
		expect(parseArgs(["--reset-cursor"])).toMatchObject({
			resetCursor: true,
		});
		expect(parseArgs(["--on-duplicate", "ignore"])).toMatchObject({
			onDuplicate: "ignore",
		});
		expect(() => parseArgs(["--on-duplicate", "merge"])).toThrow("Invalid value for --on-duplicate");
		expect(parseEnvFile("DATABASE_URL='mysql://root@localhost/db'\n# ignored\nOTHER=value")).toEqual({
			DATABASE_URL: "mysql://root@localhost/db",
			OTHER: "value",
		});
	});

	test("uses generic .env.local DATABASE_URL as local sync target", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "gnd-local-sync-"));

		try {
			await writeFile(`${cwd}/.env.local`, "DATABASE_URL='mysql://root@localhost:3306/gnd-prisma2'\n", "utf8");

			const options = await resolveOptions(["--source-url", "mysql://prod.example.com/prod"], cwd);

			expect(options.targetUrl).toBe("mysql://root@localhost:3306/gnd-prisma2");
			expect(options.initialCursorValue).toBe("2026-05-04 23:59:59.999");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	test("uses explicit local sync target from env files", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "gnd-local-sync-"));

		try {
			await writeFile(
				`${cwd}/.env.local`,
				"DATABASE_URL='mysql://root@localhost/app-db'\nLOCAL_DATABASE_URL='mysql://root@localhost:3308/import-db'\n",
				"utf8",
			);

			const options = await resolveOptions(["--source-url", "mysql://prod.example.com/prod"], cwd);

			expect(options.targetUrl).toBe("mysql://root@localhost:3308/import-db");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	test("detects raw MySQL duplicate-key errors", () => {
		expect(isDuplicateKeyError(new Error("Raw query failed. Code: `1062`. Message: `Duplicate entry 'x' for key 'Users_email_key'`"))).toBe(
			true,
		);
		expect(
			isDuplicateKeyError({
				code: "P2010",
				meta: { code: "1062", message: "Duplicate entry 'x' for key 'Users_email_key'" },
			}),
		).toBe(true);
		expect(isDuplicateKeyError(new Error("Raw query failed. Code: `1038`. Message: `Out of sort memory`"))).toBe(false);
	});

	test("resets a local table with quoted identifiers and restores FK checks", async () => {
		const calls: string[] = [];
		const target = {
			$executeRawUnsafe: async (sql: string) => {
				calls.push(sql);
			},
		};

		await resetLocalTable(target, "Bad`Table");

		expect(calls).toEqual([
			"SET FOREIGN_KEY_CHECKS = 0",
			"DELETE FROM `Bad``Table`",
			"ALTER TABLE `Bad``Table` AUTO_INCREMENT = 1",
			"SET FOREIGN_KEY_CHECKS = 1",
		]);
	});

	test("restores FK checks when auto-increment reset is not supported", async () => {
		const calls: string[] = [];
		const target = {
			$executeRawUnsafe: async (sql: string) => {
				calls.push(sql);
				if (sql.startsWith("ALTER TABLE")) {
					throw new Error("no auto increment");
				}
			},
		};

		await resetLocalTable(target, "StaticTable");

		expect(calls).toEqual([
			"SET FOREIGN_KEY_CHECKS = 0",
			"DELETE FROM `StaticTable`",
			"ALTER TABLE `StaticTable` AUTO_INCREMENT = 1",
			"SET FOREIGN_KEY_CHECKS = 1",
		]);
	});

	test("builds ignored duplicate reports with readable skip reasons", () => {
		const context = createDuplicateContext();

		expect(buildDuplicateSkipReason(context)).toContain("Skipped after duplicate-key conflict");
		expect(buildDuplicateSkipReason(context)).toContain("Duplicate entry");
	});

	test("duplicate recovery ignore returns a skipped report", async () => {
		const recovery = await recoverFromDuplicateConflict({
			context: createDuplicateContext({ read: 25, written: 10 }),
			manifest: createManifest(),
			target: undefined,
			state: createState(),
			stateFile: "/tmp/not-written.json",
			options: createOptions("ignore"),
			resetAttempts: new Set(),
		});

		expect(recovery).toMatchObject({
			type: "skip",
			report: {
				table: "NoteTags",
				mode: "insert-only",
				read: 25,
				written: 10,
			},
		});
	});

	test("duplicate recovery cancel rethrows the original error", async () => {
		const error = new Error("duplicate");

		await expect(
			recoverFromDuplicateConflict({
				context: createDuplicateContext({ error }),
				manifest: createManifest(),
				target: undefined,
				state: createState(),
				stateFile: "/tmp/not-written.json",
				options: createOptions("cancel"),
				resetAttempts: new Set(),
			}),
		).rejects.toBe(error);
	});

	test("duplicate recovery reset clears table cursor and records one reset attempt", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "gnd-local-sync-"));
		const stateFile = `${cwd}/state.json`;
		const calls: string[] = [];
		const target = {
			$executeRawUnsafe: async (sql: string) => {
				calls.push(sql);
			},
		};
		const state = createState();
		const resetAttempts = new Set<string>();

		try {
			const recovery = await recoverFromDuplicateConflict({
				context: createDuplicateContext(),
				manifest: createManifest(),
				target,
				state,
				stateFile,
				options: createOptions("reset"),
				resetAttempts,
			});

			expect(recovery).toMatchObject({ type: "retry" });
			expect(state.tables.NoteTags).toBeUndefined();
			expect(resetAttempts.has("NoteTags")).toBe(true);
			expect(calls).toContain("DELETE FROM `NoteTags`");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	test("duplicate recovery refuses a second reset for the same table", async () => {
		await expect(
			recoverFromDuplicateConflict({
				context: createDuplicateContext({ resetAttempted: true }),
				manifest: createManifest(),
				target: {
					$executeRawUnsafe: async () => undefined,
				},
				state: createState(),
				stateFile: "/tmp/not-written.json",
				options: createOptions("reset"),
				resetAttempts: new Set(["NoteTags"]),
			}),
		).rejects.toThrow("refusing to reset the same table twice");
	});
});

function createManifest(): TableManifest {
	return {
		table: "NoteTags",
		columns: ["id", "tagName", "tagValue", "notePadId", "createdAt"],
		keyColumns: ["id"],
		cursorColumns: ["createdAt"],
		mode: "insert-only",
	};
}

function createState(): SyncState {
	return {
		version: 1,
		updatedAt: new Date(0).toISOString(),
		tables: {
			NoteTags: {
				cursorValue: "2026-06-01 00:00:00.000",
				keyValues: { id: 1 },
				cursorColumns: ["createdAt"],
				mode: "insert-only",
				completedFullScan: true,
				syncedAt: new Date(0).toISOString(),
			},
		},
	};
}

function createOptions(onDuplicate: SyncOptions["onDuplicate"]): SyncOptions {
	return {
		sourceUrl: "mysql://prod.example.com/gnd",
		targetUrl: "mysql://root@localhost:3306/gnd-prisma2",
		stateFile: "/tmp/local-sync-state.json",
		initialCursorValue: "2026-05-04 23:59:59.999",
		dryRun: false,
		resetCursor: false,
		refreshStatic: false,
		staticRefreshMaxRows: 5_000,
		readBatchSize: 10_000,
		writeBatchSize: 500,
		onDuplicate,
	};
}

function createDuplicateContext(overrides: Partial<DuplicateConflictContext> = {}): DuplicateConflictContext {
	const error = new Error("Raw query failed. Code: `1062`. Message: `Duplicate entry 'x' for key 'NoteTags_tagName_tagValue_notePadId_key'`");
	return {
		table: "NoteTags",
		mode: "insert-only",
		error,
		message: error.message,
		read: 10,
		written: 0,
		cursorValue: "2026-06-01 00:00:00.000",
		resetAttempted: false,
		...overrides,
	};
}
