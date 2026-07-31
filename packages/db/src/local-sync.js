"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteIdent = quoteIdent;
exports.buildCursorExpression = buildCursorExpression;
exports.buildCursorWhereClause = buildCursorWhereClause;
exports.buildKeysetWhereClause = buildKeysetWhereClause;
exports.buildUpsertSql = buildUpsertSql;
exports.normalizeUpsertValue = normalizeUpsertValue;
exports.buildUpsertValues = buildUpsertValues;
exports.classifyTable = classifyTable;
exports.assertSafeConnections = assertSafeConnections;
exports.redactDatabaseUrl = redactDatabaseUrl;
exports.readState = readState;
exports.writeState = writeState;
exports.parseArgs = parseArgs;
exports.parseEnvFile = parseEnvFile;
exports.readFirstEnvValue = readFirstEnvValue;
exports.resolveOptions = resolveOptions;
exports.getTableManifest = getTableManifest;
exports.syncDatabases = syncDatabases;
exports.recoverFromDuplicateConflict = recoverFromDuplicateConflict;
exports.buildDuplicateSkipReason = buildDuplicateSkipReason;
exports.resetLocalTable = resetLocalTable;
exports.isDuplicateKeyError = isDuplicateKeyError;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const client_1 = require("@prisma/client");
class DuplicateKeySyncError extends Error {
    context;
    constructor(context) {
        super(context.message);
        this.name = "DuplicateKeySyncError";
        this.context = context;
    }
}
const DEFAULT_STATE = {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    tables: {},
};
const DEFAULT_DOCKER_DATABASE_URL = "mysql://root@127.0.0.1:3307/gnd-prisma2";
const DEFAULT_INITIAL_CURSOR_VALUE = "2026-05-04 23:59:59.999";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "mysql"]);
const DUPLICATE_POLICIES = new Set(["prompt", "ignore", "reset", "cancel"]);
const TARGET_MODES = new Set(["local", "remote-dev"]);
function quoteIdent(identifier) {
    return `\`${identifier.replaceAll("`", "``")}\``;
}
function buildCursorExpression(cursorColumns) {
    return `COALESCE(${[...cursorColumns.map(quoteIdent), "'1000-01-01 00:00:00.000'"].join(", ")})`;
}
function buildCursorWhereClause(cursorExpression, keyColumns, cursor) {
    if (!cursor?.cursorValue) {
        return { sql: "", params: [] };
    }
    const params = [cursor.cursorValue, cursor.cursorValue];
    const keyComparisons = [];
    for (const [index, keyColumn] of keyColumns.entries()) {
        const equalPrefix = keyColumns
            .slice(0, index)
            .map((column) => `${quoteIdent(column)} = ?`)
            .join(" AND ");
        const comparison = `${quoteIdent(keyColumn)} > ?`;
        keyComparisons.push(equalPrefix ? `(${equalPrefix} AND ${comparison})` : `(${comparison})`);
        for (const prefixColumn of keyColumns.slice(0, index)) {
            params.push(cursor.keyValues[prefixColumn]);
        }
        params.push(cursor.keyValues[keyColumn]);
    }
    return {
        sql: `WHERE (${cursorExpression} > ? OR (${cursorExpression} = ? AND (${keyComparisons.join(" OR ")})))`,
        params,
    };
}
function buildKeysetWhereClause(keyColumns, keyValues, cursorExpression, minCursorValue) {
    if ((!keyValues || keyColumns.length === 0) && (!cursorExpression || !minCursorValue)) {
        return { sql: "", params: [] };
    }
    const params = [];
    const filters = [];
    const keyComparisons = [];
    if (cursorExpression && minCursorValue) {
        filters.push(`${cursorExpression} > ?`);
        params.push(minCursorValue);
    }
    if (keyValues && keyColumns.length > 0) {
        for (const [index, keyColumn] of keyColumns.entries()) {
            const equalPrefix = keyColumns
                .slice(0, index)
                .map((column) => `${quoteIdent(column)} = ?`)
                .join(" AND ");
            const comparison = `${quoteIdent(keyColumn)} > ?`;
            keyComparisons.push(equalPrefix ? `(${equalPrefix} AND ${comparison})` : `(${comparison})`);
            for (const prefixColumn of keyColumns.slice(0, index)) {
                params.push(keyValues[prefixColumn]);
            }
            params.push(keyValues[keyColumn]);
        }
        filters.push(`(${keyComparisons.join(" OR ")})`);
    }
    return {
        sql: `WHERE ${filters.join(" AND ")}`,
        params,
    };
}
function buildUpsertSql(table, columns, keyColumns, rowCount) {
    if (rowCount < 1) {
        throw new Error("rowCount must be greater than zero");
    }
    const columnList = columns.map(quoteIdent).join(", ");
    const rowPlaceholder = `(${columns.map(() => "?").join(", ")})`;
    const placeholders = Array.from({ length: rowCount }, () => rowPlaceholder).join(", ");
    const updates = columns.map((column) => `${quoteIdent(column)} = VALUES(${quoteIdent(column)})`).join(", ");
    return `INSERT INTO ${quoteIdent(table)} (${columnList}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${updates}`;
}
function normalizeUpsertValue(value) {
    if (Array.isArray(value) || isPlainObject(value)) {
        return JSON.stringify(value);
    }
    return value;
}
function buildUpsertValues(columns, rows) {
    return rows.flatMap((row) => columns.map((column) => normalizeUpsertValue(row[column])));
}
function classifyTable(input) {
    const hasUpdatedAt = input.columns.includes("updatedAt");
    const hasCreatedAt = input.columns.includes("createdAt");
    if (input.keyColumns.length === 0) {
        return {
            table: input.table,
            columns: input.columns,
            keyColumns: [],
            cursorColumns: [],
            mode: "skip",
            reason: "No primary or unique key was detected.",
        };
    }
    if (hasUpdatedAt) {
        return {
            table: input.table,
            columns: input.columns,
            keyColumns: input.keyColumns,
            cursorColumns: hasCreatedAt ? ["updatedAt", "createdAt"] : ["updatedAt"],
            mode: "incremental",
        };
    }
    if (hasCreatedAt) {
        return {
            table: input.table,
            columns: input.columns,
            keyColumns: input.keyColumns,
            cursorColumns: ["createdAt"],
            mode: "insert-only",
            reason: "No updatedAt column; new rows are synced by createdAt only.",
        };
    }
    if (input.refreshStatic) {
        return {
            table: input.table,
            columns: input.columns,
            keyColumns: input.keyColumns,
            cursorColumns: [],
            mode: "static-refresh",
            reason: "No timestamp column; table is eligible for opt-in full refresh upsert.",
        };
    }
    return {
        table: input.table,
        columns: input.columns,
        keyColumns: input.keyColumns,
        cursorColumns: [],
        mode: "skip",
        reason: "No updatedAt or createdAt column. Pass --refresh-static to upsert small static tables.",
    };
}
function assertSafeConnections(sourceUrl, targetUrl, options = {}) {
    const source = new URL(sourceUrl);
    const target = new URL(targetUrl);
    const sourceDatabase = source.pathname.replace(/^\//, "");
    const targetDatabase = target.pathname.replace(/^\//, "");
    const targetMode = options.targetMode ?? "local";
    const sameHostDatabase = source.hostname === target.hostname &&
        effectiveMysqlPort(source) === effectiveMysqlPort(target) &&
        sourceDatabase === targetDatabase;
    const isPlanetScaleEndpoint = isPlanetScaleHostname(source.hostname);
    const distinctBranchUsernames = targetMode === "remote-dev" &&
        isPlanetScaleEndpoint &&
        Boolean(source.username) &&
        Boolean(target.username) &&
        source.username !== target.username;
    if (sameHostDatabase && !distinctBranchUsernames) {
        throw new Error("Refusing to sync because source and target point at the same database.");
    }
    if (targetMode === "remote-dev") {
        return;
    }
    if (isPlanetScaleHostname(target.hostname)) {
        throw new Error(`Refusing to write to production-looking target host: ${target.hostname}`);
    }
    if (!LOCAL_HOSTS.has(target.hostname) && !target.hostname.endsWith(".local")) {
        throw new Error(`Refusing to write to non-local target host: ${target.hostname}. Set DATABASE_URL in .env.local to a local MySQL database or pass --target-url.`);
    }
}
function effectiveMysqlPort(url) {
    return url.port || "3306";
}
function isPlanetScaleHostname(hostname) {
    const normalized = hostname.toLowerCase();
    return normalized === "psdb.cloud" || normalized.endsWith(".psdb.cloud");
}
function redactDatabaseUrl(databaseUrl) {
    try {
        const parsed = new URL(databaseUrl);
        const credentials = parsed.username || parsed.password ? "<redacted>@" : "";
        return `${parsed.protocol}//${credentials}${parsed.host}${parsed.pathname}`;
    }
    catch {
        return "<invalid database URL>";
    }
}
async function readState(stateFile) {
    try {
        const raw = await (0, promises_1.readFile)(stateFile, "utf8");
        const parsed = JSON.parse(raw);
        return {
            version: 1,
            updatedAt: parsed.updatedAt ?? DEFAULT_STATE.updatedAt,
            tables: parsed.tables ?? {},
        };
    }
    catch (error) {
        if (error.code === "ENOENT") {
            return { ...DEFAULT_STATE, tables: {} };
        }
        throw error;
    }
}
async function writeState(stateFile, state) {
    await (0, promises_1.mkdir)((0, node_path_1.dirname)(stateFile), { recursive: true });
    await (0, promises_1.writeFile)(stateFile, `${JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
}
function parseArgs(argv) {
    const parsed = {};
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        const next = () => {
            const value = argv[++index];
            if (!value || value.startsWith("--")) {
                throw new Error(`Missing value for ${arg}`);
            }
            return value;
        };
        switch (arg) {
            case "--dry-run":
                parsed.dryRun = true;
                break;
            case "--reset-cursor":
            case "--reset-state":
                parsed.resetCursor = true;
                break;
            case "--refresh-static":
                parsed.refreshStatic = true;
                break;
            case "--table":
                parsed.table = next();
                break;
            case "--state-file":
                parsed.stateFile = next();
                break;
            case "--source-url":
                parsed.sourceUrl = next();
                break;
            case "--target-url":
                parsed.targetUrl = next();
                break;
            case "--target-mode": {
                const value = next();
                if (!TARGET_MODES.has(value)) {
                    throw new Error(`Invalid value for --target-mode: ${value}. Expected local or remote-dev.`);
                }
                parsed.targetMode = value;
                break;
            }
            case "--initial-cursor-value":
                parsed.initialCursorValue = next();
                break;
            case "--read-batch-size":
                parsed.readBatchSize = Number(next());
                break;
            case "--write-batch-size":
                parsed.writeBatchSize = Number(next());
                break;
            case "--static-refresh-max-rows":
                parsed.staticRefreshMaxRows = Number(next());
                break;
            case "--on-duplicate": {
                const value = next();
                if (!DUPLICATE_POLICIES.has(value)) {
                    throw new Error(`Invalid value for --on-duplicate: ${value}. Expected prompt, ignore, reset, or cancel.`);
                }
                parsed.onDuplicate = value;
                break;
            }
            case "-h":
            case "--help":
                parsed.help = true;
                break;
            default:
                if (arg?.startsWith("--")) {
                    throw new Error(`Unknown option: ${arg}`);
                }
        }
    }
    return parsed;
}
function parseEnvFile(text) {
    const values = {};
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }
        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) {
            continue;
        }
        const [, key, rawValue] = match;
        if (!key || rawValue === undefined) {
            continue;
        }
        values[key] = rawValue.trim().replace(/^['"]|['"]$/g, "");
    }
    return values;
}
async function readFirstEnvValue(files, keys) {
    for (const file of files) {
        try {
            const env = parseEnvFile(await (0, promises_1.readFile)(file, "utf8"));
            for (const key of keys) {
                if (env[key]) {
                    return env[key];
                }
            }
        }
        catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
        }
    }
    return undefined;
}
async function resolveOptions(argv, cwd = process.cwd()) {
    const parsed = parseArgs(argv);
    const repoRoot = cwd.endsWith("packages/db") ? (0, node_path_1.resolve)(cwd, "../..") : cwd;
    const targetMode = parsed.targetMode ?? normalizeTargetMode(process.env.GND_DB_SYNC_TARGET_MODE ?? "local");
    const sourceUrl = parsed.sourceUrl ??
        (await readFirstEnvValue([(0, node_path_1.resolve)(cwd, ".env.production"), (0, node_path_1.resolve)(repoRoot, ".env.production")], ["DATABASE_URL"]));
    const targetUrl = await resolveTargetUrl(parsed.targetUrl, targetMode, cwd, repoRoot);
    const stateFile = parsed.stateFile ?? (0, node_path_1.resolve)(repoRoot, ".local-db-sync", targetMode, "state.json");
    if (parsed.help) {
        return {
            sourceUrl: sourceUrl ?? "",
            targetUrl: targetUrl ?? "",
            targetMode,
            stateFile,
            table: parsed.table,
            initialCursorValue: parsed.initialCursorValue ?? process.env.LOCAL_SYNC_INITIAL_CURSOR_VALUE ?? DEFAULT_INITIAL_CURSOR_VALUE,
            dryRun: parsed.dryRun ?? false,
            resetCursor: parsed.resetCursor ?? false,
            refreshStatic: parsed.refreshStatic ?? false,
            staticRefreshMaxRows: parsed.staticRefreshMaxRows ?? 5_000,
            readBatchSize: parsed.readBatchSize ?? 10_000,
            writeBatchSize: parsed.writeBatchSize ?? 500,
            onDuplicate: parsed.onDuplicate ?? "prompt",
            help: true,
        };
    }
    if (!sourceUrl) {
        throw new Error("Missing production database URL. Set DATABASE_URL in .env.production or pass --source-url.");
    }
    if (!targetUrl) {
        throw new Error("Missing target database URL. Set DATABASE_URL in .env.local or .env.remote.local, or pass --target-url.");
    }
    return {
        sourceUrl,
        targetUrl,
        targetMode,
        stateFile,
        table: parsed.table,
        initialCursorValue: parsed.initialCursorValue ?? process.env.LOCAL_SYNC_INITIAL_CURSOR_VALUE ?? DEFAULT_INITIAL_CURSOR_VALUE,
        dryRun: parsed.dryRun ?? false,
        resetCursor: parsed.resetCursor ?? false,
        refreshStatic: parsed.refreshStatic ?? false,
        staticRefreshMaxRows: parsed.staticRefreshMaxRows ?? 5_000,
        readBatchSize: parsed.readBatchSize ?? 10_000,
        writeBatchSize: parsed.writeBatchSize ?? 500,
        onDuplicate: parsed.onDuplicate ?? "prompt",
    };
}
async function resolveTargetUrl(parsedTargetUrl, targetMode, cwd, repoRoot) {
    if (parsedTargetUrl) {
        return parsedTargetUrl;
    }
    if (targetMode === "remote-dev") {
        return ((await readFirstEnvValue([(0, node_path_1.resolve)(cwd, ".env.remote.local"), (0, node_path_1.resolve)(repoRoot, ".env.remote.local")], ["DATABASE_URL"])) ??
            process.env.DATABASE_URL);
    }
    return ((await readFirstEnvValue([(0, node_path_1.resolve)(cwd, ".env.local"), (0, node_path_1.resolve)(cwd, ".env"), (0, node_path_1.resolve)(repoRoot, ".env.local"), (0, node_path_1.resolve)(repoRoot, ".env")], [
        "DATABASE_URL",
    ])) ??
        process.env.DATABASE_URL ??
        DEFAULT_DOCKER_DATABASE_URL);
}
function normalizeTargetMode(value) {
    if (TARGET_MODES.has(value)) {
        return value;
    }
    throw new Error(`Invalid target mode: ${value}. Expected local or remote-dev.`);
}
async function getTableManifest(db, refreshStatic, tableFilter) {
    const tables = await db.$queryRaw `
		SELECT TABLE_NAME AS table_name
		FROM INFORMATION_SCHEMA.TABLES
		WHERE TABLE_SCHEMA = DATABASE()
			AND TABLE_TYPE = 'BASE TABLE'
		ORDER BY TABLE_NAME
	`;
    const filteredTables = tables
        .map((row) => row.table_name)
        .filter((table) => table !== "_prisma_migrations")
        .filter((table) => !tableFilter || table === tableFilter);
    const manifests = [];
    const columnsByTable = await getColumnsByTable(db, filteredTables);
    const keyColumnsByTable = await getBestKeyColumnsByTable(db, filteredTables);
    for (const table of filteredTables) {
        const columns = columnsByTable.get(table) ?? [];
        const keyColumns = keyColumnsByTable.get(table) ?? [];
        manifests.push(classifyTable({
            table,
            columns: columns.map((column) => column.name),
            keyColumns,
            refreshStatic,
        }));
    }
    return manifests;
}
async function getColumnsByTable(db, tables) {
    const columnsByTable = new Map();
    for (const table of tables) {
        columnsByTable.set(table, []);
    }
    if (tables.length === 0) {
        return columnsByTable;
    }
    const rows = await db.$queryRawUnsafe(`
			SELECT TABLE_NAME AS tableName, COLUMN_NAME AS name, DATA_TYPE AS dataType, ORDINAL_POSITION AS ordinal
			FROM INFORMATION_SCHEMA.COLUMNS
			WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME IN (${tables.map(() => "?").join(", ")})
			ORDER BY TABLE_NAME, ORDINAL_POSITION
		`, ...tables);
    for (const row of rows) {
        columnsByTable.set(row.tableName, [...(columnsByTable.get(row.tableName) ?? []), row]);
    }
    return columnsByTable;
}
async function getBestKeyColumnsByTable(db, tables) {
    const keyColumnsByTable = new Map();
    for (const table of tables) {
        keyColumnsByTable.set(table, []);
    }
    if (tables.length === 0) {
        return keyColumnsByTable;
    }
    const rows = await db.$queryRawUnsafe(`
			SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, INDEX_NAME AS index_name,
				SEQ_IN_INDEX AS seq_in_index, NON_UNIQUE AS non_unique
			FROM INFORMATION_SCHEMA.STATISTICS
			WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME IN (${tables.map(() => "?").join(", ")})
				AND (INDEX_NAME = 'PRIMARY' OR NON_UNIQUE = 0)
			ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
		`, ...tables);
    const rowsByTable = new Map();
    for (const row of rows) {
        rowsByTable.set(row.table_name, [...(rowsByTable.get(row.table_name) ?? []), row]);
    }
    for (const [table, tableRows] of rowsByTable) {
        const primaryRows = tableRows
            .filter((row) => row.index_name === "PRIMARY")
            .sort((left, right) => Number(left.seq_in_index) - Number(right.seq_in_index));
        if (primaryRows.length > 0) {
            keyColumnsByTable.set(table, primaryRows.map((row) => row.column_name));
            continue;
        }
        const indexes = new Map();
        for (const row of tableRows.filter((tableRow) => Number(tableRow.non_unique) === 0)) {
            indexes.set(row.index_name, [...(indexes.get(row.index_name) ?? []), row]);
        }
        const bestUniqueIndex = [...indexes.values()]
            .sort((left, right) => left.length - right.length)
            .at(0)
            ?.sort((left, right) => Number(left.seq_in_index) - Number(right.seq_in_index));
        if (bestUniqueIndex) {
            keyColumnsByTable.set(table, bestUniqueIndex.map((row) => row.column_name));
        }
    }
    return keyColumnsByTable;
}
async function getColumns(db, table) {
    return db.$queryRawUnsafe(`
			SELECT COLUMN_NAME AS name, DATA_TYPE AS dataType, ORDINAL_POSITION AS ordinal
			FROM INFORMATION_SCHEMA.COLUMNS
			WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME = ?
			ORDER BY ORDINAL_POSITION
		`, table);
}
async function getBestKeyColumns(db, table) {
    const primaryRows = await db.$queryRawUnsafe(`
			SELECT COLUMN_NAME AS column_name, INDEX_NAME AS index_name, SEQ_IN_INDEX AS seq_in_index
			FROM INFORMATION_SCHEMA.STATISTICS
			WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME = ?
				AND INDEX_NAME = 'PRIMARY'
			ORDER BY SEQ_IN_INDEX
		`, table);
    if (primaryRows.length > 0) {
        return primaryRows.map((row) => row.column_name);
    }
    const uniqueRows = await db.$queryRawUnsafe(`
			SELECT COLUMN_NAME AS column_name, INDEX_NAME AS index_name, SEQ_IN_INDEX AS seq_in_index
			FROM INFORMATION_SCHEMA.STATISTICS
			WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME = ?
				AND NON_UNIQUE = 0
			ORDER BY INDEX_NAME, SEQ_IN_INDEX
		`, table);
    const indexes = new Map();
    for (const row of uniqueRows) {
        indexes.set(row.index_name, [...(indexes.get(row.index_name) ?? []), row]);
    }
    return [...indexes.values()]
        .sort((left, right) => left.length - right.length)
        .at(0)
        ?.sort((left, right) => Number(left.seq_in_index) - Number(right.seq_in_index))
        .map((row) => row.column_name) ?? [];
}
async function syncDatabases(options) {
    assertSafeConnections(options.sourceUrl, options.targetUrl, {
        targetMode: options.targetMode,
    });
    const source = new client_1.PrismaClient({ datasources: { db: { url: options.sourceUrl } } });
    const target = options.dryRun ? undefined : new client_1.PrismaClient({ datasources: { db: { url: options.targetUrl } } });
    const reports = [];
    const state = await readState(options.stateFile);
    const resetAttempts = new Set();
    try {
        options.onProgress?.({ type: "manifest:start" });
        const manifests = await getTableManifest(source, options.refreshStatic, options.table);
        if (options.table && manifests.length === 0) {
            throw new Error(`Table not found in source database: ${options.table}`);
        }
        options.onProgress?.({ type: "manifest", tableCount: manifests.length });
        if (options.resetCursor) {
            for (const manifest of manifests) {
                delete state.tables[manifest.table];
            }
            if (!options.dryRun) {
                await writeState(options.stateFile, state);
            }
        }
        for (const manifest of manifests) {
            options.onProgress?.({ type: "table:start", table: manifest.table, mode: manifest.mode });
            if (manifest.mode === "skip") {
                const report = {
                    table: manifest.table,
                    mode: manifest.mode,
                    read: 0,
                    written: 0,
                    skippedReason: manifest.reason,
                };
                options.onProgress?.({ type: "table:skip", table: manifest.table, reason: manifest.reason ?? "Skipped." });
                options.onProgress?.({ type: "table:done", report });
                reports.push(report);
                continue;
            }
            while (true) {
                try {
                    const tableOptions = resetAttempts.has(manifest.table) ? { ...options, initialCursorValue: null } : options;
                    const report = manifest.mode === "static-refresh"
                        ? await syncStaticTable(source, target, manifest, tableOptions)
                        : await syncCursorTable(source, target, manifest, state, tableOptions);
                    options.onProgress?.({ type: "table:done", report });
                    reports.push(report);
                    break;
                }
                catch (error) {
                    if (!(error instanceof DuplicateKeySyncError)) {
                        throw error;
                    }
                    const recovery = await recoverFromDuplicateConflict({
                        context: {
                            ...error.context,
                            resetAttempted: resetAttempts.has(manifest.table),
                        },
                        manifest,
                        target,
                        state,
                        stateFile: options.stateFile,
                        options,
                        resetAttempts,
                    });
                    if (recovery.type === "skip") {
                        options.onProgress?.({ type: "table:skip", table: manifest.table, reason: recovery.report.skippedReason ?? "Skipped." });
                        options.onProgress?.({ type: "table:done", report: recovery.report });
                        reports.push(recovery.report);
                        break;
                    }
                    options.onProgress?.({ type: "table:reset", table: manifest.table, reason: recovery.reason });
                }
            }
        }
    }
    finally {
        await source.$disconnect();
        await target?.$disconnect();
    }
    return reports;
}
async function recoverFromDuplicateConflict(input) {
    const action = await resolveDuplicateConflictAction(input.context, input.options);
    if (action === "ignore") {
        return {
            type: "skip",
            report: {
                table: input.context.table,
                mode: input.context.mode,
                read: input.context.read,
                written: input.context.written,
                cursorValue: input.context.cursorValue,
                skippedReason: buildDuplicateSkipReason(input.context),
            },
        };
    }
    if (action === "cancel") {
        throw input.context.error;
    }
    if (input.context.resetAttempted || input.resetAttempts.has(input.context.table)) {
        throw new Error(`Duplicate-key conflict remained after resetting ${input.context.table}; refusing to reset the same table twice in one sync run.`);
    }
    if (!input.target) {
        throw new Error("Internal sync error: target database client is required to reset a table.");
    }
    await resetLocalTable(input.target, input.manifest.table);
    delete input.state.tables[input.manifest.table];
    await writeState(input.stateFile, input.state);
    input.resetAttempts.add(input.manifest.table);
    return {
        type: "retry",
        reason: `Reset local table after duplicate-key conflict: ${input.context.message}`,
    };
}
async function resolveDuplicateConflictAction(context, options) {
    if (options.onDuplicateConflict) {
        return options.onDuplicateConflict(context);
    }
    return options.onDuplicate === "prompt" ? "cancel" : options.onDuplicate;
}
function buildDuplicateSkipReason(context) {
    return `Skipped after duplicate-key conflict: ${context.message}`;
}
async function resetLocalTable(target, table) {
    await target.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    try {
        await target.$executeRawUnsafe(`DELETE FROM ${quoteIdent(table)}`);
        try {
            await target.$executeRawUnsafe(`ALTER TABLE ${quoteIdent(table)} AUTO_INCREMENT = 1`);
        }
        catch {
            // Some tables do not have an auto-increment column. The data reset is still valid.
        }
    }
    finally {
        await target.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
    }
}
async function syncCursorTable(source, target, manifest, state, options) {
    const cursorExpression = buildCursorExpression(manifest.cursorColumns);
    let cursor = applyInitialCursorFloor(state.tables[manifest.table], manifest, options.initialCursorValue);
    let totalRead = 0;
    let totalWritten = 0;
    let latestCursor = cursor;
    let keyScanCursor;
    let keyScanMinCursorValue;
    let usingKeyScan = !cursor?.completedFullScan;
    while (true) {
        const rows = usingKeyScan
            ? await readRowsByKeyset(source, manifest, cursorExpression, keyScanCursor, options.readBatchSize, keyScanMinCursorValue)
            : await readRowsByCursor(source, manifest, cursorExpression, cursor, options.readBatchSize).catch(async (error) => {
                if (!isSortMemoryError(error)) {
                    throw error;
                }
                usingKeyScan = true;
                keyScanCursor = undefined;
                keyScanMinCursorValue = cursor?.cursorValue;
                options.onProgress?.({
                    type: "table:batch",
                    table: manifest.table,
                    mode: manifest.mode,
                    read: totalRead,
                    written: totalWritten,
                    cursorValue: "falling back to primary-key scan after source sort-memory error",
                });
                return readRowsByKeyset(source, manifest, cursorExpression, keyScanCursor, options.readBatchSize, keyScanMinCursorValue);
            });
        if (rows.length === 0) {
            break;
        }
        totalRead += rows.length;
        const lastRow = rows.at(-1);
        if (!lastRow) {
            break;
        }
        keyScanCursor = Object.fromEntries(manifest.keyColumns.map((column) => [column, lastRow[column]]));
        latestCursor = usingKeyScan
            ? buildMaxCursor(rows, manifest, latestCursor)
            : {
                cursorValue: normalizeCursorValue(lastRow.__sync_cursor),
                keyValues: keyScanCursor,
                cursorColumns: manifest.cursorColumns,
                mode: manifest.mode,
                completedFullScan: true,
                syncedAt: new Date().toISOString(),
            };
        if (!options.dryRun) {
            if (!target) {
                throw new Error("Internal sync error: target database client is required when dryRun is false.");
            }
            try {
                totalWritten += await upsertRows(target, manifest, rows, options.writeBatchSize);
            }
            catch (error) {
                if (!isDuplicateKeyError(error)) {
                    throw error;
                }
                throw new DuplicateKeySyncError({
                    table: manifest.table,
                    mode: manifest.mode,
                    error,
                    message: formatSyncErrorMessage(error),
                    read: totalRead,
                    written: totalWritten,
                    cursorValue: latestCursor?.cursorValue,
                });
            }
            state.tables[manifest.table] = latestCursor;
            await writeState(options.stateFile, state);
        }
        options.onProgress?.({
            type: "table:batch",
            table: manifest.table,
            mode: manifest.mode,
            read: totalRead,
            written: totalWritten,
            cursorValue: latestCursor?.cursorValue,
        });
        if (!usingKeyScan) {
            cursor = latestCursor;
        }
        if (rows.length < options.readBatchSize) {
            break;
        }
    }
    if (usingKeyScan && latestCursor) {
        latestCursor.completedFullScan = true;
        latestCursor.syncedAt = new Date().toISOString();
        if (!options.dryRun) {
            state.tables[manifest.table] = latestCursor;
            await writeState(options.stateFile, state);
        }
    }
    return {
        table: manifest.table,
        mode: manifest.mode,
        read: totalRead,
        written: totalWritten,
        cursorValue: latestCursor?.cursorValue,
        skippedReason: manifest.reason,
    };
}
function applyInitialCursorFloor(cursor, manifest, initialCursorValue) {
    if (!initialCursorValue || manifest.cursorColumns.length === 0) {
        return cursor;
    }
    if (cursor && compareCursorValues(cursor.cursorValue, initialCursorValue) >= 0) {
        return cursor;
    }
    return {
        cursorValue: initialCursorValue,
        keyValues: Object.fromEntries(manifest.keyColumns.map((column) => [column, null])),
        cursorColumns: manifest.cursorColumns,
        mode: manifest.mode,
        completedFullScan: true,
        syncedAt: new Date().toISOString(),
    };
}
async function readRowsByCursor(source, manifest, cursorExpression, cursor, readBatchSize) {
    const where = buildCursorWhereClause(cursorExpression, manifest.keyColumns, cursor);
    const orderBy = [cursorExpression, ...manifest.keyColumns.map(quoteIdent)].join(", ");
    return source.$queryRawUnsafe(`
			SELECT ${manifest.columns.map(quoteIdent).join(", ")}, ${cursorExpression} AS __sync_cursor
			FROM ${quoteIdent(manifest.table)}
			${where.sql}
			ORDER BY ${orderBy}
			LIMIT ?
		`, ...where.params, readBatchSize);
}
async function readRowsByKeyset(source, manifest, cursorExpression, keyValues, readBatchSize, minCursorValue) {
    const where = buildKeysetWhereClause(manifest.keyColumns, keyValues, cursorExpression, minCursorValue);
    return source.$queryRawUnsafe(`
			SELECT ${manifest.columns.map(quoteIdent).join(", ")}, ${cursorExpression} AS __sync_cursor
			FROM ${quoteIdent(manifest.table)}
			${where.sql}
			ORDER BY ${manifest.keyColumns.map(quoteIdent).join(", ")}
			LIMIT ?
		`, ...where.params, readBatchSize);
}
function buildMaxCursor(rows, manifest, previous) {
    let maxCursorValue = previous?.cursorValue ?? null;
    let maxKeyValues = previous?.keyValues ?? {};
    for (const row of rows) {
        const rowCursorValue = normalizeCursorValue(row.__sync_cursor);
        if (compareCursorValues(rowCursorValue, maxCursorValue) >= 0) {
            maxCursorValue = rowCursorValue;
            maxKeyValues = Object.fromEntries(manifest.keyColumns.map((column) => [column, row[column]]));
        }
    }
    return {
        cursorValue: maxCursorValue,
        keyValues: maxKeyValues,
        cursorColumns: manifest.cursorColumns,
        mode: manifest.mode,
        completedFullScan: false,
        syncedAt: new Date().toISOString(),
    };
}
function compareCursorValues(left, right) {
    if (left === right) {
        return 0;
    }
    if (left == null) {
        return -1;
    }
    if (right == null) {
        return 1;
    }
    return left.localeCompare(right);
}
function isSortMemoryError(error) {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("Code: `1038`") || message.includes("Out of sort memory");
}
function isDuplicateKeyError(error) {
    const code = getErrorField(error, "code");
    const meta = getErrorField(error, "meta");
    const metaCode = meta?.code;
    const metaMessage = meta?.message;
    const message = error instanceof Error ? error.message : String(error);
    return (code === "1062" ||
        metaCode === "1062" ||
        message.includes("Code: `1062`") ||
        message.includes("Duplicate entry") ||
        (typeof metaMessage === "string" && metaMessage.includes("Duplicate entry")));
}
function getErrorField(error, field) {
    return typeof error === "object" && error !== null ? error[field] : undefined;
}
function formatSyncErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
async function syncStaticTable(source, target, manifest, options) {
    const countRows = await source.$queryRawUnsafe(`SELECT COUNT(*) AS count FROM ${quoteIdent(manifest.table)}`);
    const count = Number(countRows[0]?.count ?? 0);
    if (count > options.staticRefreshMaxRows) {
        return {
            table: manifest.table,
            mode: "skip",
            read: 0,
            written: 0,
            skippedReason: `Static table has ${count} rows, above --static-refresh-max-rows=${options.staticRefreshMaxRows}.`,
        };
    }
    const rows = await source.$queryRawUnsafe(`SELECT ${manifest.columns.map(quoteIdent).join(", ")} FROM ${quoteIdent(manifest.table)}`);
    let written = 0;
    if (!options.dryRun) {
        if (!target) {
            throw new Error("Internal sync error: target database client is required when dryRun is false.");
        }
        try {
            written = await upsertRows(target, manifest, rows, options.writeBatchSize);
        }
        catch (error) {
            if (!isDuplicateKeyError(error)) {
                throw error;
            }
            throw new DuplicateKeySyncError({
                table: manifest.table,
                mode: manifest.mode,
                error,
                message: formatSyncErrorMessage(error),
                read: rows.length,
                written,
            });
        }
    }
    options.onProgress?.({
        type: "table:batch",
        table: manifest.table,
        mode: manifest.mode,
        read: rows.length,
        written,
    });
    return {
        table: manifest.table,
        mode: manifest.mode,
        read: rows.length,
        written,
        skippedReason: manifest.reason,
    };
}
async function upsertRows(target, manifest, rows, writeBatchSize) {
    let written = 0;
    for (let index = 0; index < rows.length; index += writeBatchSize) {
        const batch = rows.slice(index, index + writeBatchSize);
        const sql = buildUpsertSql(manifest.table, manifest.columns, manifest.keyColumns, batch.length);
        const values = buildUpsertValues(manifest.columns, batch);
        await target.$executeRawUnsafe(sql, ...values);
        written += batch.length;
    }
    return written;
}
function isPlainObject(value) {
    if (value === null || typeof value !== "object") {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function normalizeCursorValue(value) {
    if (value == null) {
        return null;
    }
    if (value instanceof Date) {
        return value.toISOString().slice(0, 23).replace("T", " ");
    }
    return String(value);
}
