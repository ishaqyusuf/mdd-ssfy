// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import {
	assertSafeConnections,
	buildCursorExpression,
	buildCursorWhereClause,
	buildKeysetWhereClause,
	buildUpsertSql,
	classifyTable,
	parseArgs,
	parseEnvFile,
	quoteIdent,
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

		expect(where.sql).toBe("WHERE (`a` > ?) OR (`a` = ? AND `b` > ?)");
		expect(where.params).toEqual([7, 7, "x"]);
	});

	test("builds multi-row upsert SQL", () => {
		expect(buildUpsertSql("Users", ["id", "name", "updatedAt"], ["id"], 2)).toBe(
			"INSERT INTO `Users` (`id`, `name`, `updatedAt`) VALUES (?, ?, ?), (?, ?, ?) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `updatedAt` = VALUES(`updatedAt`)",
		);
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
		expect(parseArgs(["--reset-cursor"])).toMatchObject({
			resetCursor: true,
		});
		expect(parseEnvFile("DATABASE_URL='mysql://root@localhost/db'\n# ignored\nOTHER=value")).toEqual({
			DATABASE_URL: "mysql://root@localhost/db",
			OTHER: "value",
		});
	});
});
