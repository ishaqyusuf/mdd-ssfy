import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

export type SyncMode = "incremental" | "insert-only" | "static-refresh" | "skip";
export type DuplicateConflictAction = "ignore" | "reset" | "cancel";
export type DuplicateConflictPolicy = DuplicateConflictAction | "prompt";
export type SyncTargetMode = "local" | "remote-dev";

export type ColumnInfo = {
	name: string;
	dataType: string;
	ordinal: number;
};

export type TableManifest = {
	table: string;
	columns: string[];
	keyColumns: string[];
	cursorColumns: string[];
	mode: SyncMode;
	reason?: string;
};

export type TableCursor = {
	cursorValue: string | null;
	keyValues: Record<string, unknown>;
	cursorColumns: string[];
	mode: SyncMode;
	completedFullScan?: boolean;
	syncedAt: string;
};

export type SyncState = {
	version: 1;
	updatedAt: string;
	tables: Record<string, TableCursor>;
};

export type SyncOptions = {
	sourceUrl: string;
	targetUrl: string;
	targetMode: SyncTargetMode;
	allowRemoteDevTarget: boolean;
	stateFile: string;
	table?: string;
	initialCursorValue: string | null;
	dryRun: boolean;
	resetCursor: boolean;
	refreshStatic: boolean;
	staticRefreshMaxRows: number;
	readBatchSize: number;
	writeBatchSize: number;
	onDuplicate: DuplicateConflictPolicy;
	onDuplicateConflict?: (context: DuplicateConflictContext) => DuplicateConflictAction | Promise<DuplicateConflictAction>;
	onProgress?: (event: SyncProgressEvent) => void;
};

export type SyncReport = {
	table: string;
	mode: SyncMode;
	read: number;
	written: number;
	cursorValue?: string | null;
	skippedReason?: string;
};

export type DuplicateConflictContext = {
	table: string;
	mode: SyncMode;
	error: unknown;
	message: string;
	read: number;
	written: number;
	cursorValue?: string | null;
	resetAttempted: boolean;
};

export type SyncProgressEvent =
	| { type: "manifest:start" }
	| { type: "manifest"; tableCount: number }
	| { type: "table:start"; table: string; mode: SyncMode }
	| { type: "table:batch"; table: string; mode: SyncMode; read: number; written: number; cursorValue?: string | null }
	| { type: "table:reset"; table: string; reason: string }
	| { type: "table:skip"; table: string; reason: string }
	| { type: "table:done"; report: SyncReport };

type KeyColumnRow = {
	column_name: string;
	index_name: string;
	seq_in_index: bigint | number;
};

type RawTargetClient = {
	$executeRawUnsafe: (query: string, ...values: unknown[]) => PromiseLike<unknown>;
};

class DuplicateKeySyncError extends Error {
	context: Omit<DuplicateConflictContext, "resetAttempted">;

	constructor(context: Omit<DuplicateConflictContext, "resetAttempted">) {
		super(context.message);
		this.name = "DuplicateKeySyncError";
		this.context = context;
	}
}

const DEFAULT_STATE: SyncState = {
	version: 1,
	updatedAt: new Date(0).toISOString(),
	tables: {},
};
const DEFAULT_LOCAL_DATABASE_URL = "mysql://root@127.0.0.1:3307/gnd-prisma2";
const DEFAULT_INITIAL_CURSOR_VALUE = "2026-05-04 23:59:59.999";

const PROD_HOST_PATTERNS = [/psdb\.cloud$/i, /connect\.psdb\.cloud$/i];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "mysql"]);
const DUPLICATE_POLICIES = new Set<DuplicateConflictPolicy>(["prompt", "ignore", "reset", "cancel"]);
const TARGET_MODES = new Set<SyncTargetMode>(["local", "remote-dev"]);

export function quoteIdent(identifier: string): string {
	return `\`${identifier.replaceAll("`", "``")}\``;
}

export function buildCursorExpression(cursorColumns: string[]): string {
	return `COALESCE(${[...cursorColumns.map(quoteIdent), "'1000-01-01 00:00:00.000'"].join(", ")})`;
}

export function buildCursorWhereClause(
	cursorExpression: string,
	keyColumns: string[],
	cursor?: TableCursor,
): { sql: string; params: unknown[] } {
	if (!cursor?.cursorValue) {
		return { sql: "", params: [] };
	}

	const params: unknown[] = [cursor.cursorValue, cursor.cursorValue];
	const keyComparisons: string[] = [];

	for (let index = 0; index < keyColumns.length; index += 1) {
		const equalPrefix = keyColumns
			.slice(0, index)
			.map((column) => `${quoteIdent(column)} = ?`)
			.join(" AND ");
		const keyColumn = keyColumns[index]!;
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

export function buildKeysetWhereClause(
	keyColumns: string[],
	keyValues?: Record<string, unknown>,
	cursorExpression?: string,
	minCursorValue?: string | null,
): { sql: string; params: unknown[] } {
	if ((!keyValues || keyColumns.length === 0) && (!cursorExpression || !minCursorValue)) {
		return { sql: "", params: [] };
	}

	const params: unknown[] = [];
	const filters: string[] = [];
	const keyComparisons: string[] = [];

	if (cursorExpression && minCursorValue) {
		filters.push(`${cursorExpression} > ?`);
		params.push(minCursorValue);
	}

	if (keyValues && keyColumns.length > 0) {
		for (let index = 0; index < keyColumns.length; index += 1) {
			const equalPrefix = keyColumns
				.slice(0, index)
				.map((column) => `${quoteIdent(column)} = ?`)
				.join(" AND ");
			const keyColumn = keyColumns[index]!;
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

export function buildUpsertSql(table: string, columns: string[], keyColumns: string[], rowCount: number): string {
	if (rowCount < 1) {
		throw new Error("rowCount must be greater than zero");
	}

	const columnList = columns.map(quoteIdent).join(", ");
	const rowPlaceholder = `(${columns.map(() => "?").join(", ")})`;
	const placeholders = Array.from({ length: rowCount }, () => rowPlaceholder).join(", ");
	const updates = columns.map((column) => `${quoteIdent(column)} = VALUES(${quoteIdent(column)})`).join(", ");

	return `INSERT INTO ${quoteIdent(table)} (${columnList}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${updates}`;
}

export function normalizeUpsertValue(value: unknown): unknown {
	if (Array.isArray(value) || isPlainObject(value)) {
		return JSON.stringify(value);
	}

	return value;
}

export function buildUpsertValues(columns: string[], rows: Array<Record<string, unknown>>): unknown[] {
	return rows.flatMap((row) => columns.map((column) => normalizeUpsertValue(row[column])));
}

export function classifyTable(input: {
	table: string;
	columns: string[];
	keyColumns: string[];
	refreshStatic: boolean;
}): TableManifest {
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

export function assertSafeConnections(
	sourceUrl: string,
	targetUrl: string,
	options: { targetMode?: SyncTargetMode; allowRemoteDevTarget?: boolean; dryRun?: boolean } = {},
): void {
	const source = new URL(sourceUrl);
	const target = new URL(targetUrl);
	const sourceDatabase = source.pathname.replace(/^\//, "");
	const targetDatabase = target.pathname.replace(/^\//, "");
	const targetMode = options.targetMode ?? "local";

	if (source.hostname === target.hostname && source.port === target.port && sourceDatabase === targetDatabase) {
		throw new Error("Refusing to sync because source and target point at the same database.");
	}

	if (targetMode === "remote-dev") {
		if (!options.dryRun && !options.allowRemoteDevTarget) {
			throw new Error("Refusing to write to remote-dev target without GND_ALLOW_REMOTE_DEV_DB_SYNC=1.");
		}
		return;
	}

	if (PROD_HOST_PATTERNS.some((pattern) => pattern.test(target.hostname))) {
		throw new Error(`Refusing to write to production-looking target host: ${target.hostname}`);
	}

	if (!LOCAL_HOSTS.has(target.hostname) && !target.hostname.endsWith(".local")) {
		throw new Error(
			`Refusing to write to non-local target host: ${target.hostname}. Set LOCAL_DATABASE_URL to a local MySQL database.`,
		);
	}
}

export function redactDatabaseUrl(databaseUrl: string): string {
	try {
		const parsed = new URL(databaseUrl);
		const credentials = parsed.username || parsed.password ? "<redacted>@" : "";
		return `${parsed.protocol}//${credentials}${parsed.host}${parsed.pathname}`;
	} catch {
		return "<invalid database URL>";
	}
}

export async function readState(stateFile: string): Promise<SyncState> {
	try {
		const raw = await readFile(stateFile, "utf8");
		const parsed = JSON.parse(raw) as SyncState;
		return {
			version: 1,
			updatedAt: parsed.updatedAt ?? DEFAULT_STATE.updatedAt,
			tables: parsed.tables ?? {},
		};
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return { ...DEFAULT_STATE, tables: {} };
		}

		throw error;
	}
}

export async function writeState(stateFile: string, state: SyncState): Promise<void> {
	await mkdir(dirname(stateFile), { recursive: true });
	await writeFile(
		stateFile,
		`${JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)}\n`,
		"utf8",
	);
}

export function parseArgs(argv: string[]): Partial<SyncOptions> & { help?: boolean } {
	const parsed: Partial<SyncOptions> & { help?: boolean } = {};

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
				if (!TARGET_MODES.has(value as SyncTargetMode)) {
					throw new Error(`Invalid value for --target-mode: ${value}. Expected local or remote-dev.`);
				}
				parsed.targetMode = value as SyncTargetMode;
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
				if (!DUPLICATE_POLICIES.has(value as DuplicateConflictPolicy)) {
					throw new Error(`Invalid value for --on-duplicate: ${value}. Expected prompt, ignore, reset, or cancel.`);
				}
				parsed.onDuplicate = value as DuplicateConflictPolicy;
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

export function parseEnvFile(text: string): Record<string, string> {
	const values: Record<string, string> = {};

	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
		if (!match) {
			continue;
		}

		values[match[1]!] = match[2]!.trim().replace(/^['"]|['"]$/g, "");
	}

	return values;
}

export async function readFirstEnvValue(files: string[], keys: string[]): Promise<string | undefined> {
	for (const file of files) {
		try {
			const env = parseEnvFile(await readFile(file, "utf8"));
			for (const key of keys) {
				if (env[key]) {
					return env[key];
				}
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
				throw error;
			}
		}
	}

	return undefined;
}

function isTruthy(value: string | undefined): boolean {
	return value === "1" || value === "true" || value === "yes" || value === "on";
}

export async function resolveOptions(argv: string[], cwd = process.cwd()): Promise<SyncOptions & { help?: boolean }> {
	const parsed = parseArgs(argv);
	const repoRoot = cwd.endsWith("packages/db") ? resolve(cwd, "../..") : cwd;
	const targetMode = parsed.targetMode ?? normalizeTargetMode(process.env.GND_DB_SYNC_TARGET_MODE ?? process.env.GND_DB_MODE ?? "local");
	const envFiles = [resolve(cwd, ".env.local"), resolve(cwd, ".env"), resolve(repoRoot, ".env.local"), resolve(repoRoot, ".env")];
	const sourceUrl =
		parsed.sourceUrl ??
		process.env.PROD_DATABASE_URL ??
		process.env.SOURCE_DATABASE_URL ??
		(await readFirstEnvValue(
			[resolve(cwd, ".env.production"), resolve(repoRoot, ".env.production")],
			["PROD_DATABASE_URL", "SOURCE_DATABASE_URL", "DATABASE_URL"],
		)) ??
		(await readFirstEnvValue(
			[resolve(cwd, ".env.local"), resolve(repoRoot, ".env.local")],
			["PROD_DATABASE_URL", "SOURCE_DATABASE_URL"],
		));
	const targetUrl = await resolveTargetUrl(parsed.targetUrl, targetMode, envFiles);
	const stateFile = parsed.stateFile ?? resolve(repoRoot, ".local-db-sync", targetMode, "state.json");
	const allowRemoteDevTarget = isTruthy(process.env.GND_ALLOW_REMOTE_DEV_DB_SYNC);

	if (parsed.help) {
		return {
			sourceUrl: sourceUrl ?? "",
			targetUrl: targetUrl ?? "",
			targetMode,
			allowRemoteDevTarget,
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
		throw new Error("Missing production database URL. Set PROD_DATABASE_URL or packages/db/.env.production DATABASE_URL.");
	}

	if (!targetUrl) {
		throw new Error("Missing target database URL. Set LOCAL_DATABASE_URL, REMOTE_DEV_DATABASE_URL, or TARGET_DATABASE_URL.");
	}

	return {
		sourceUrl,
		targetUrl,
		targetMode,
		allowRemoteDevTarget,
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

async function resolveTargetUrl(
	parsedTargetUrl: string | undefined,
	targetMode: SyncTargetMode,
	envFiles: string[],
): Promise<string | undefined> {
	if (parsedTargetUrl) {
		return parsedTargetUrl;
	}

	if (targetMode === "remote-dev") {
		return (
			process.env.REMOTE_DEV_DATABASE_URL ??
			process.env.DEV_DATABASE_URL ??
			process.env.TARGET_DATABASE_URL ??
			(await readFirstEnvValue(envFiles, ["REMOTE_DEV_DATABASE_URL", "DEV_DATABASE_URL", "TARGET_DATABASE_URL", "DATABASE_URL"]))
		);
	}

	return (
		process.env.LOCAL_DATABASE_URL ??
		process.env.TARGET_DATABASE_URL ??
		(await readFirstEnvValue(envFiles, ["LOCAL_DATABASE_URL", "TARGET_DATABASE_URL", "DATABASE_URL"])) ??
		DEFAULT_LOCAL_DATABASE_URL
	);
}

function normalizeTargetMode(value: string): SyncTargetMode {
	if (TARGET_MODES.has(value as SyncTargetMode)) {
		return value as SyncTargetMode;
	}

	throw new Error(`Invalid target mode: ${value}. Expected local or remote-dev.`);
}

export async function getTableManifest(
	db: PrismaClient,
	refreshStatic: boolean,
	tableFilter?: string,
): Promise<TableManifest[]> {
	const tables = await db.$queryRaw<Array<{ table_name: string }>>`
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
	const manifests: TableManifest[] = [];
	const columnsByTable = await getColumnsByTable(db, filteredTables);
	const keyColumnsByTable = await getBestKeyColumnsByTable(db, filteredTables);

	for (const table of filteredTables) {
		const columns = columnsByTable.get(table) ?? [];
		const keyColumns = keyColumnsByTable.get(table) ?? [];
		manifests.push(
			classifyTable({
				table,
				columns: columns.map((column) => column.name),
				keyColumns,
				refreshStatic,
			}),
		);
	}

	return manifests;
}

async function getColumnsByTable(db: PrismaClient, tables: string[]): Promise<Map<string, ColumnInfo[]>> {
	const columnsByTable = new Map<string, ColumnInfo[]>();

	for (const table of tables) {
		columnsByTable.set(table, []);
	}

	if (tables.length === 0) {
		return columnsByTable;
	}

	const rows = await db.$queryRawUnsafe<Array<ColumnInfo & { tableName: string }>>(
		`
			SELECT TABLE_NAME AS tableName, COLUMN_NAME AS name, DATA_TYPE AS dataType, ORDINAL_POSITION AS ordinal
			FROM INFORMATION_SCHEMA.COLUMNS
			WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME IN (${tables.map(() => "?").join(", ")})
			ORDER BY TABLE_NAME, ORDINAL_POSITION
		`,
		...tables,
	);

	for (const row of rows) {
		columnsByTable.set(row.tableName, [...(columnsByTable.get(row.tableName) ?? []), row]);
	}

	return columnsByTable;
}

async function getBestKeyColumnsByTable(db: PrismaClient, tables: string[]): Promise<Map<string, string[]>> {
	const keyColumnsByTable = new Map<string, string[]>();

	for (const table of tables) {
		keyColumnsByTable.set(table, []);
	}

	if (tables.length === 0) {
		return keyColumnsByTable;
	}

	const rows = await db.$queryRawUnsafe<Array<KeyColumnRow & { table_name: string; non_unique: bigint | number }>>(
		`
			SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, INDEX_NAME AS index_name,
				SEQ_IN_INDEX AS seq_in_index, NON_UNIQUE AS non_unique
			FROM INFORMATION_SCHEMA.STATISTICS
			WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME IN (${tables.map(() => "?").join(", ")})
				AND (INDEX_NAME = 'PRIMARY' OR NON_UNIQUE = 0)
			ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
		`,
		...tables,
	);

	const rowsByTable = new Map<string, Array<KeyColumnRow & { non_unique: bigint | number }>>();
	for (const row of rows) {
		rowsByTable.set(row.table_name, [...(rowsByTable.get(row.table_name) ?? []), row]);
	}

	for (const [table, tableRows] of rowsByTable) {
		const primaryRows = tableRows
			.filter((row) => row.index_name === "PRIMARY")
			.sort((left, right) => Number(left.seq_in_index) - Number(right.seq_in_index));

		if (primaryRows.length > 0) {
			keyColumnsByTable.set(
				table,
				primaryRows.map((row) => row.column_name),
			);
			continue;
		}

		const indexes = new Map<string, KeyColumnRow[]>();
		for (const row of tableRows.filter((tableRow) => Number(tableRow.non_unique) === 0)) {
			indexes.set(row.index_name, [...(indexes.get(row.index_name) ?? []), row]);
		}

		const bestUniqueIndex = [...indexes.values()]
			.sort((left, right) => left.length - right.length)
			.at(0)
			?.sort((left, right) => Number(left.seq_in_index) - Number(right.seq_in_index));

		if (bestUniqueIndex) {
			keyColumnsByTable.set(
				table,
				bestUniqueIndex.map((row) => row.column_name),
			);
		}
	}

	return keyColumnsByTable;
}

async function getColumns(db: PrismaClient, table: string): Promise<ColumnInfo[]> {
	return db.$queryRawUnsafe<ColumnInfo[]>(
		`
			SELECT COLUMN_NAME AS name, DATA_TYPE AS dataType, ORDINAL_POSITION AS ordinal
			FROM INFORMATION_SCHEMA.COLUMNS
			WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME = ?
			ORDER BY ORDINAL_POSITION
		`,
		table,
	);
}

async function getBestKeyColumns(db: PrismaClient, table: string): Promise<string[]> {
	const primaryRows = await db.$queryRawUnsafe<KeyColumnRow[]>(
		`
			SELECT COLUMN_NAME AS column_name, INDEX_NAME AS index_name, SEQ_IN_INDEX AS seq_in_index
			FROM INFORMATION_SCHEMA.STATISTICS
			WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME = ?
				AND INDEX_NAME = 'PRIMARY'
			ORDER BY SEQ_IN_INDEX
		`,
		table,
	);

	if (primaryRows.length > 0) {
		return primaryRows.map((row) => row.column_name);
	}

	const uniqueRows = await db.$queryRawUnsafe<KeyColumnRow[]>(
		`
			SELECT COLUMN_NAME AS column_name, INDEX_NAME AS index_name, SEQ_IN_INDEX AS seq_in_index
			FROM INFORMATION_SCHEMA.STATISTICS
			WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME = ?
				AND NON_UNIQUE = 0
			ORDER BY INDEX_NAME, SEQ_IN_INDEX
		`,
		table,
	);

	const indexes = new Map<string, KeyColumnRow[]>();
	for (const row of uniqueRows) {
		indexes.set(row.index_name, [...(indexes.get(row.index_name) ?? []), row]);
	}

	return [...indexes.values()]
		.sort((left, right) => left.length - right.length)
		.at(0)
		?.sort((left, right) => Number(left.seq_in_index) - Number(right.seq_in_index))
		.map((row) => row.column_name) ?? [];
}

export async function syncDatabases(options: SyncOptions): Promise<SyncReport[]> {
	assertSafeConnections(options.sourceUrl, options.targetUrl, {
		targetMode: options.targetMode,
		allowRemoteDevTarget: options.allowRemoteDevTarget,
		dryRun: options.dryRun,
	});

	const source = new PrismaClient({ datasources: { db: { url: options.sourceUrl } } });
	const target = options.dryRun ? undefined : new PrismaClient({ datasources: { db: { url: options.targetUrl } } });
	const reports: SyncReport[] = [];
	const state = await readState(options.stateFile);
	const resetAttempts = new Set<string>();

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
				} satisfies SyncReport;
				options.onProgress?.({ type: "table:skip", table: manifest.table, reason: manifest.reason ?? "Skipped." });
				options.onProgress?.({ type: "table:done", report });
				reports.push(report);
				continue;
			}

			while (true) {
				try {
					const tableOptions = resetAttempts.has(manifest.table) ? { ...options, initialCursorValue: null } : options;
					const report =
						manifest.mode === "static-refresh"
							? await syncStaticTable(source, target, manifest, tableOptions)
							: await syncCursorTable(source, target, manifest, state, tableOptions);
					options.onProgress?.({ type: "table:done", report });
					reports.push(report);
					break;
				} catch (error) {
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
	} finally {
		await source.$disconnect();
		await target?.$disconnect();
	}

	return reports;
}

export async function recoverFromDuplicateConflict(input: {
	context: DuplicateConflictContext;
	manifest: TableManifest;
	target: RawTargetClient | undefined;
	state: SyncState;
	stateFile: string;
	options: SyncOptions;
	resetAttempts: Set<string>;
}): Promise<{ type: "retry"; reason: string } | { type: "skip"; report: SyncReport }> {
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
		throw new Error(
			`Duplicate-key conflict remained after resetting ${input.context.table}; refusing to reset the same table twice in one sync run.`,
		);
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

async function resolveDuplicateConflictAction(
	context: DuplicateConflictContext,
	options: SyncOptions,
): Promise<DuplicateConflictAction> {
	if (options.onDuplicateConflict) {
		return options.onDuplicateConflict(context);
	}

	return options.onDuplicate === "prompt" ? "cancel" : options.onDuplicate;
}

export function buildDuplicateSkipReason(context: DuplicateConflictContext): string {
	return `Skipped after duplicate-key conflict: ${context.message}`;
}

export async function resetLocalTable(target: RawTargetClient, table: string): Promise<void> {
	await target.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");

	try {
		await target.$executeRawUnsafe(`DELETE FROM ${quoteIdent(table)}`);
		try {
			await target.$executeRawUnsafe(`ALTER TABLE ${quoteIdent(table)} AUTO_INCREMENT = 1`);
		} catch {
			// Some tables do not have an auto-increment column. The data reset is still valid.
		}
	} finally {
		await target.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
	}
}

async function syncCursorTable(
	source: PrismaClient,
	target: PrismaClient | undefined,
	manifest: TableManifest,
	state: SyncState,
	options: SyncOptions,
): Promise<SyncReport> {
	const cursorExpression = buildCursorExpression(manifest.cursorColumns);
	let cursor = applyInitialCursorFloor(state.tables[manifest.table], manifest, options.initialCursorValue);
	let totalRead = 0;
	let totalWritten = 0;
	let latestCursor: TableCursor | undefined = cursor;
	let keyScanCursor: Record<string, unknown> | undefined;
	let keyScanMinCursorValue: string | null | undefined;
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
					return readRowsByKeyset(
						source,
						manifest,
						cursorExpression,
						keyScanCursor,
						options.readBatchSize,
						keyScanMinCursorValue,
					);
				});

		if (rows.length === 0) {
			break;
		}

		totalRead += rows.length;
		const lastRow = rows[rows.length - 1]!;
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
			} catch (error) {
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

function applyInitialCursorFloor(
	cursor: TableCursor | undefined,
	manifest: TableManifest,
	initialCursorValue: string | null,
): TableCursor | undefined {
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

async function readRowsByCursor(
	source: PrismaClient,
	manifest: TableManifest,
	cursorExpression: string,
	cursor: TableCursor | undefined,
	readBatchSize: number,
) {
	const where = buildCursorWhereClause(cursorExpression, manifest.keyColumns, cursor);
	const orderBy = [cursorExpression, ...manifest.keyColumns.map(quoteIdent)].join(", ");

	return source.$queryRawUnsafe<Array<Record<string, unknown>>>(
		`
			SELECT ${manifest.columns.map(quoteIdent).join(", ")}, ${cursorExpression} AS __sync_cursor
			FROM ${quoteIdent(manifest.table)}
			${where.sql}
			ORDER BY ${orderBy}
			LIMIT ?
		`,
		...where.params,
		readBatchSize,
	);
}

async function readRowsByKeyset(
	source: PrismaClient,
	manifest: TableManifest,
	cursorExpression: string,
	keyValues: Record<string, unknown> | undefined,
	readBatchSize: number,
	minCursorValue?: string | null,
) {
	const where = buildKeysetWhereClause(manifest.keyColumns, keyValues, cursorExpression, minCursorValue);

	return source.$queryRawUnsafe<Array<Record<string, unknown>>>(
		`
			SELECT ${manifest.columns.map(quoteIdent).join(", ")}, ${cursorExpression} AS __sync_cursor
			FROM ${quoteIdent(manifest.table)}
			${where.sql}
			ORDER BY ${manifest.keyColumns.map(quoteIdent).join(", ")}
			LIMIT ?
		`,
		...where.params,
		readBatchSize,
	);
}

function buildMaxCursor(
	rows: Array<Record<string, unknown>>,
	manifest: TableManifest,
	previous?: TableCursor,
): TableCursor {
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

function compareCursorValues(left: string | null, right: string | null): number {
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

function isSortMemoryError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return message.includes("Code: `1038`") || message.includes("Out of sort memory");
}

export function isDuplicateKeyError(error: unknown): boolean {
	const code = getErrorField(error, "code");
	const meta = getErrorField(error, "meta") as Record<string, unknown> | undefined;
	const metaCode = meta?.code;
	const metaMessage = meta?.message;
	const message = error instanceof Error ? error.message : String(error);

	return (
		code === "1062" ||
		metaCode === "1062" ||
		message.includes("Code: `1062`") ||
		message.includes("Duplicate entry") ||
		(typeof metaMessage === "string" && metaMessage.includes("Duplicate entry"))
	);
}

function getErrorField(error: unknown, field: string): unknown {
	return typeof error === "object" && error !== null ? (error as Record<string, unknown>)[field] : undefined;
}

function formatSyncErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

async function syncStaticTable(
	source: PrismaClient,
	target: PrismaClient | undefined,
	manifest: TableManifest,
	options: SyncOptions,
): Promise<SyncReport> {
	const countRows = await source.$queryRawUnsafe<Array<{ count: bigint }>>(
		`SELECT COUNT(*) AS count FROM ${quoteIdent(manifest.table)}`,
	);
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

	const rows = await source.$queryRawUnsafe<Array<Record<string, unknown>>>(
		`SELECT ${manifest.columns.map(quoteIdent).join(", ")} FROM ${quoteIdent(manifest.table)}`,
	);
	let written = 0;
	if (!options.dryRun) {
		if (!target) {
			throw new Error("Internal sync error: target database client is required when dryRun is false.");
		}
		try {
			written = await upsertRows(target, manifest, rows, options.writeBatchSize);
		} catch (error) {
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

async function upsertRows(
	target: PrismaClient,
	manifest: TableManifest,
	rows: Array<Record<string, unknown>>,
	writeBatchSize: number,
): Promise<number> {
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object") {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function normalizeCursorValue(value: unknown): string | null {
	if (value == null) {
		return null;
	}

	if (value instanceof Date) {
		return value.toISOString().slice(0, 23).replace("T", " ");
	}

	return String(value);
}
