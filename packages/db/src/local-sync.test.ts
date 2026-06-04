// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	assertSafeConnections,
	buildCursorExpression,
	buildCursorWhereClause,
	buildKeysetWhereClause,
	buildUpsertSql,
	buildUpsertValues,
	classifyTable,
	parseArgs,
	parseEnvFile,
	quoteIdent,
	resolveOptions,
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
			"INSERT INTO `Users` (`id`, `name`, `updatedAt`) VALUES (?, ?, ?), (?, ?, ?) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `updatedAt` = VALUES(`updatedAt`)",
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
		expect(parseEnvFile("DATABASE_URL='mysql://root@localhost/db'\n# ignored\nOTHER=value")).toEqual({
			DATABASE_URL: "mysql://root@localhost/db",
			OTHER: "value",
		});
	});

	test("does not use generic .env.local DATABASE_URL as local sync target", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "gnd-local-sync-"));

		try {
			await writeFile(`${cwd}/.env.local`, "DATABASE_URL='mysql://root@localhost/gnd-prisma2'\n", "utf8");

			const options = await resolveOptions(["--source-url", "mysql://prod.example.com/prod"], cwd);

			expect(options.targetUrl).toBe("mysql://root@127.0.0.1:3307/gnd-prisma2");
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
});
