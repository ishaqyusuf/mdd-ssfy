"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-expect-error packages/db typecheck does not include Bun test types.
const bun_test_1 = require("bun:test");
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const local_sync_1 = require("./local-sync");
(0, bun_test_1.describe)("local db sync helpers", () => {
    (0, bun_test_1.test)("quotes MySQL identifiers", () => {
        (0, bun_test_1.expect)((0, local_sync_1.quoteIdent)("SalesOrders")).toBe("`SalesOrders`");
        (0, bun_test_1.expect)((0, local_sync_1.quoteIdent)("bad`name")).toBe("`bad``name`");
    });
    (0, bun_test_1.test)("classifies updatedAt tables as incremental", () => {
        (0, bun_test_1.expect)((0, local_sync_1.classifyTable)({
            table: "SalesOrders",
            columns: ["id", "createdAt", "updatedAt", "deletedAt"],
            keyColumns: ["id"],
            refreshStatic: false,
        })).toMatchObject({
            mode: "incremental",
            cursorColumns: ["updatedAt", "createdAt"],
        });
    });
    (0, bun_test_1.test)("classifies createdAt-only tables as insert-only", () => {
        (0, bun_test_1.expect)((0, local_sync_1.classifyTable)({
            table: "PageView",
            columns: ["id", "createdAt"],
            keyColumns: ["id"],
            refreshStatic: false,
        })).toMatchObject({
            mode: "insert-only",
            cursorColumns: ["createdAt"],
        });
    });
    (0, bun_test_1.test)("skips tables without keys", () => {
        (0, bun_test_1.expect)((0, local_sync_1.classifyTable)({
            table: "NoKey",
            columns: ["createdAt", "updatedAt"],
            keyColumns: [],
            refreshStatic: true,
        })).toMatchObject({
            mode: "skip",
            reason: "No primary or unique key was detected.",
        });
    });
    (0, bun_test_1.test)("builds deterministic cursor where clause with composite keys", () => {
        const where = (0, local_sync_1.buildCursorWhereClause)((0, local_sync_1.buildCursorExpression)(["updatedAt", "createdAt"]), ["a", "b"], {
            cursorValue: "2026-05-19 12:00:00.000",
            keyValues: { a: 7, b: "x" },
            cursorColumns: ["updatedAt", "createdAt"],
            mode: "incremental",
            syncedAt: "2026-05-19T12:00:00.000Z",
        });
        (0, bun_test_1.expect)(where.sql).toContain("COALESCE(`updatedAt`, `createdAt`, '1000-01-01 00:00:00.000') > ?");
        (0, bun_test_1.expect)(where.sql).toContain("`a` > ?");
        (0, bun_test_1.expect)(where.sql).toContain("`a` = ? AND `b` > ?");
        (0, bun_test_1.expect)(where.params).toEqual(["2026-05-19 12:00:00.000", "2026-05-19 12:00:00.000", 7, 7, "x"]);
    });
    (0, bun_test_1.test)("builds deterministic keyset where clause with composite keys", () => {
        const where = (0, local_sync_1.buildKeysetWhereClause)(["a", "b"], { a: 7, b: "x" });
        (0, bun_test_1.expect)(where.sql).toBe("WHERE ((`a` > ?) OR (`a` = ? AND `b` > ?))");
        (0, bun_test_1.expect)(where.params).toEqual([7, 7, "x"]);
    });
    (0, bun_test_1.test)("keeps cursor floor on keyset fallback scans", () => {
        const where = (0, local_sync_1.buildKeysetWhereClause)(["a", "b"], { a: 7, b: "x" }, (0, local_sync_1.buildCursorExpression)(["updatedAt", "createdAt"]), "2026-05-04 23:59:59.999");
        (0, bun_test_1.expect)(where.sql).toBe("WHERE COALESCE(`updatedAt`, `createdAt`, '1000-01-01 00:00:00.000') > ? AND ((`a` > ?) OR (`a` = ? AND `b` > ?))");
        (0, bun_test_1.expect)(where.params).toEqual(["2026-05-04 23:59:59.999", 7, 7, "x"]);
    });
    (0, bun_test_1.test)("builds multi-row upsert SQL", () => {
        (0, bun_test_1.expect)((0, local_sync_1.buildUpsertSql)("Users", ["id", "name", "updatedAt"], ["id"], 2)).toBe("INSERT INTO `Users` (`id`, `name`, `updatedAt`) VALUES (?, ?, ?), (?, ?, ?) ON DUPLICATE KEY UPDATE `id` = VALUES(`id`), `name` = VALUES(`name`), `updatedAt` = VALUES(`updatedAt`)");
    });
    (0, bun_test_1.test)("serializes JSON values before raw MySQL upserts", () => {
        const createdAt = new Date("2026-05-25T12:00:00.000Z");
        const bytes = new Uint8Array([1, 2, 3]);
        (0, bun_test_1.expect)((0, local_sync_1.buildUpsertValues)(["id", "tags", "settings", "createdAt", "bytes"], [
            {
                id: 1,
                tags: ["builder", "vip"],
                settings: { alerts: true },
                createdAt,
                bytes,
            },
        ])).toEqual([1, '["builder","vip"]', '{"alerts":true}', createdAt, bytes]);
    });
    (0, bun_test_1.test)("rejects unsafe target connections", () => {
        (0, bun_test_1.expect)(() => (0, local_sync_1.assertSafeConnections)("mysql://user:pass@aws.connect.psdb.cloud/gndprodesk", "mysql://root@aws.connect.psdb.cloud/gndprodesk")).toThrow("same database");
        (0, bun_test_1.expect)(() => (0, local_sync_1.assertSafeConnections)("mysql://user:pass@aws.connect.psdb.cloud/gndprodesk", "mysql://root@example.com/gndprodesk")).toThrow("non-local target");
        (0, bun_test_1.expect)(() => (0, local_sync_1.assertSafeConnections)("mysql://user:pass@aws.connect.psdb.cloud/gndprodesk", "mysql://root@127.0.0.1:3307/gnd-prisma2")).not.toThrow();
    });
    (0, bun_test_1.test)("accepts explicit preview targets while preserving identity guards", () => {
        const source = "mysql://prod-user:prod-pass@aws.connect.psdb.cloud/gndprodesk";
        const target = "mysql://dev-user:dev-pass@aws.connect.psdb.cloud/gndprodesk";
        (0, bun_test_1.expect)(() => (0, local_sync_1.assertSafeConnections)(source, target, { targetMode: "preview" })).not.toThrow();
        (0, bun_test_1.expect)(() => (0, local_sync_1.assertSafeConnections)(source, source, { targetMode: "preview" })).toThrow("same database");
        (0, bun_test_1.expect)(() => (0, local_sync_1.assertSafeConnections)(source, "mysql://prod-user:rotated-pass@aws.connect.psdb.cloud/gndprodesk", { targetMode: "preview" })).toThrow("same database");
        (0, bun_test_1.expect)(() => (0, local_sync_1.assertSafeConnections)("mysql://prod-user:prod-pass@generic.example.com/gndprodesk", "mysql://dev-user:dev-pass@generic.example.com/gndprodesk", { targetMode: "preview" })).toThrow("same database");
        (0, bun_test_1.expect)(() => (0, local_sync_1.assertSafeConnections)("mysql://prod-user@aws.connect.psdb.cloud/gndprodesk", "mysql://prod-user@aws.connect.psdb.cloud:3306/gndprodesk", { targetMode: "preview" })).toThrow("same database");
        (0, bun_test_1.expect)(() => (0, local_sync_1.assertSafeConnections)("mysql://prod-user@evilpsdb.cloud/gndprodesk", "mysql://dev-user@evilpsdb.cloud/gndprodesk", { targetMode: "preview" })).toThrow("same database");
    });
    (0, bun_test_1.test)("parses cli args and env files", () => {
        (0, bun_test_1.expect)((0, local_sync_1.parseArgs)(["--dry-run", "--table", "Users", "--read-batch-size", "250"])).toMatchObject({
            dryRun: true,
            table: "Users",
            readBatchSize: 250,
        });
        (0, bun_test_1.expect)((0, local_sync_1.parseArgs)(["--initial-cursor-value", "2026-05-04 23:59:59.999"])).toMatchObject({
            initialCursorValue: "2026-05-04 23:59:59.999",
        });
        (0, bun_test_1.expect)((0, local_sync_1.parseArgs)(["--reset-cursor"])).toMatchObject({
            resetCursor: true,
        });
        (0, bun_test_1.expect)((0, local_sync_1.parseArgs)(["--on-duplicate", "ignore"])).toMatchObject({
            onDuplicate: "ignore",
        });
        (0, bun_test_1.expect)((0, local_sync_1.parseArgs)(["--target-mode", "preview"])).toMatchObject({
            targetMode: "preview",
        });
        (0, bun_test_1.expect)(() => (0, local_sync_1.parseArgs)(["--on-duplicate", "merge"])).toThrow("Invalid value for --on-duplicate");
        (0, bun_test_1.expect)(() => (0, local_sync_1.parseArgs)(["--target-mode", "prod"])).toThrow("Invalid value for --target-mode");
        (0, bun_test_1.expect)((0, local_sync_1.parseEnvFile)("DATABASE_URL='mysql://root@localhost/db'\n# ignored\nOTHER=value")).toEqual({
            DATABASE_URL: "mysql://root@localhost/db",
            OTHER: "value",
        });
    });
    (0, bun_test_1.test)("uses generic .env.local DATABASE_URL as local sync target", async () => {
        const cwd = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "gnd-local-sync-"));
        try {
            await (0, promises_1.writeFile)(`${cwd}/.env.local`, "DATABASE_URL='mysql://root@localhost:3306/gnd-prisma2'\n", "utf8");
            const options = await (0, local_sync_1.resolveOptions)(["--source-url", "mysql://prod.example.com/prod"], cwd);
            (0, bun_test_1.expect)(options.targetUrl).toBe("mysql://root@localhost:3306/gnd-prisma2");
            (0, bun_test_1.expect)(options.initialCursorValue).toBe("2026-05-04 23:59:59.999");
        }
        finally {
            await (0, promises_1.rm)(cwd, { recursive: true, force: true });
        }
    });
    (0, bun_test_1.test)("uses preview mode DATABASE_URL from .env.preview", async () => {
        const cwd = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "gnd-local-sync-"));
        try {
            await (0, promises_1.writeFile)(`${cwd}/.env.local`, "DATABASE_URL='mysql://root@localhost/app-db'\n", "utf8");
            await (0, promises_1.writeFile)(`${cwd}/.env.preview`, "DATABASE_URL='mysql://dev.example.com/gnd-dev'\n", "utf8");
            const options = await (0, local_sync_1.resolveOptions)(["--source-url", "mysql://prod.example.com/prod", "--target-mode", "preview"], cwd);
            (0, bun_test_1.expect)(options.targetUrl).toBe("mysql://dev.example.com/gnd-dev");
        }
        finally {
            await (0, promises_1.rm)(cwd, { recursive: true, force: true });
        }
    });
    (0, bun_test_1.test)("uses separate cursor state files per target mode", async () => {
        const cwd = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "gnd-local-sync-"));
        try {
            const localOptions = await (0, local_sync_1.resolveOptions)([
                "--source-url",
                "mysql://prod.example.com/prod",
                "--target-url",
                "mysql://root@localhost:3306/gnd-prisma2",
                "--target-mode",
                "local",
            ], cwd);
            const previewOptions = await (0, local_sync_1.resolveOptions)([
                "--source-url",
                "mysql://prod.example.com/prod",
                "--target-url",
                "mysql://dev.example.com/gnd-dev",
                "--target-mode",
                "preview",
            ], cwd);
            (0, bun_test_1.expect)(localOptions.stateFile).toContain(".local-db-sync/local/state.json");
            (0, bun_test_1.expect)(previewOptions.stateFile).toContain(".local-db-sync/preview/state.json");
            (0, bun_test_1.expect)(localOptions.stateFile).not.toBe(previewOptions.stateFile);
        }
        finally {
            await (0, promises_1.rm)(cwd, { recursive: true, force: true });
        }
    });
    (0, bun_test_1.test)("detects raw MySQL duplicate-key errors", () => {
        (0, bun_test_1.expect)((0, local_sync_1.isDuplicateKeyError)(new Error("Raw query failed. Code: `1062`. Message: `Duplicate entry 'x' for key 'Users_email_key'`"))).toBe(true);
        (0, bun_test_1.expect)((0, local_sync_1.isDuplicateKeyError)({
            code: "P2010",
            meta: { code: "1062", message: "Duplicate entry 'x' for key 'Users_email_key'" },
        })).toBe(true);
        (0, bun_test_1.expect)((0, local_sync_1.isDuplicateKeyError)(new Error("Raw query failed. Code: `1038`. Message: `Out of sort memory`"))).toBe(false);
    });
    (0, bun_test_1.test)("resets a local table with quoted identifiers and restores FK checks", async () => {
        const calls = [];
        const target = {
            $executeRawUnsafe: async (sql) => {
                calls.push(sql);
            },
        };
        await (0, local_sync_1.resetLocalTable)(target, "Bad`Table");
        (0, bun_test_1.expect)(calls).toEqual([
            "SET FOREIGN_KEY_CHECKS = 0",
            "DELETE FROM `Bad``Table`",
            "ALTER TABLE `Bad``Table` AUTO_INCREMENT = 1",
            "SET FOREIGN_KEY_CHECKS = 1",
        ]);
    });
    (0, bun_test_1.test)("restores FK checks when auto-increment reset is not supported", async () => {
        const calls = [];
        const target = {
            $executeRawUnsafe: async (sql) => {
                calls.push(sql);
                if (sql.startsWith("ALTER TABLE")) {
                    throw new Error("no auto increment");
                }
            },
        };
        await (0, local_sync_1.resetLocalTable)(target, "StaticTable");
        (0, bun_test_1.expect)(calls).toEqual([
            "SET FOREIGN_KEY_CHECKS = 0",
            "DELETE FROM `StaticTable`",
            "ALTER TABLE `StaticTable` AUTO_INCREMENT = 1",
            "SET FOREIGN_KEY_CHECKS = 1",
        ]);
    });
    (0, bun_test_1.test)("builds ignored duplicate reports with readable skip reasons", () => {
        const context = createDuplicateContext();
        (0, bun_test_1.expect)((0, local_sync_1.buildDuplicateSkipReason)(context)).toContain("Skipped after duplicate-key conflict");
        (0, bun_test_1.expect)((0, local_sync_1.buildDuplicateSkipReason)(context)).toContain("Duplicate entry");
    });
    (0, bun_test_1.test)("duplicate recovery ignore returns a skipped report", async () => {
        const recovery = await (0, local_sync_1.recoverFromDuplicateConflict)({
            context: createDuplicateContext({ read: 25, written: 10 }),
            manifest: createManifest(),
            target: undefined,
            state: createState(),
            stateFile: "/tmp/not-written.json",
            options: createOptions("ignore"),
            resetAttempts: new Set(),
        });
        (0, bun_test_1.expect)(recovery).toMatchObject({
            type: "skip",
            report: {
                table: "NoteTags",
                mode: "insert-only",
                read: 25,
                written: 10,
            },
        });
    });
    (0, bun_test_1.test)("duplicate recovery cancel rethrows the original error", async () => {
        const error = new Error("duplicate");
        await (0, bun_test_1.expect)((0, local_sync_1.recoverFromDuplicateConflict)({
            context: createDuplicateContext({ error }),
            manifest: createManifest(),
            target: undefined,
            state: createState(),
            stateFile: "/tmp/not-written.json",
            options: createOptions("cancel"),
            resetAttempts: new Set(),
        })).rejects.toBe(error);
    });
    (0, bun_test_1.test)("duplicate recovery reset clears table cursor and records one reset attempt", async () => {
        const cwd = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "gnd-local-sync-"));
        const stateFile = `${cwd}/state.json`;
        const calls = [];
        const target = {
            $executeRawUnsafe: async (sql) => {
                calls.push(sql);
            },
        };
        const state = createState();
        const resetAttempts = new Set();
        try {
            const recovery = await (0, local_sync_1.recoverFromDuplicateConflict)({
                context: createDuplicateContext(),
                manifest: createManifest(),
                target,
                state,
                stateFile,
                options: createOptions("reset"),
                resetAttempts,
            });
            (0, bun_test_1.expect)(recovery).toMatchObject({ type: "retry" });
            (0, bun_test_1.expect)(state.tables.NoteTags).toBeUndefined();
            (0, bun_test_1.expect)(resetAttempts.has("NoteTags")).toBe(true);
            (0, bun_test_1.expect)(calls).toContain("DELETE FROM `NoteTags`");
        }
        finally {
            await (0, promises_1.rm)(cwd, { recursive: true, force: true });
        }
    });
    (0, bun_test_1.test)("duplicate recovery refuses a second reset for the same table", async () => {
        await (0, bun_test_1.expect)((0, local_sync_1.recoverFromDuplicateConflict)({
            context: createDuplicateContext({ resetAttempted: true }),
            manifest: createManifest(),
            target: {
                $executeRawUnsafe: async () => undefined,
            },
            state: createState(),
            stateFile: "/tmp/not-written.json",
            options: createOptions("reset"),
            resetAttempts: new Set(["NoteTags"]),
        })).rejects.toThrow("refusing to reset the same table twice");
    });
});
function createManifest() {
    return {
        table: "NoteTags",
        columns: ["id", "tagName", "tagValue", "notePadId", "createdAt"],
        keyColumns: ["id"],
        cursorColumns: ["createdAt"],
        mode: "insert-only",
    };
}
function createState() {
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
function createOptions(onDuplicate) {
    return {
        sourceUrl: "mysql://prod.example.com/gnd",
        targetUrl: "mysql://root@localhost:3306/gnd-prisma2",
        targetMode: "local",
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
function createDuplicateContext(overrides = {}) {
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
