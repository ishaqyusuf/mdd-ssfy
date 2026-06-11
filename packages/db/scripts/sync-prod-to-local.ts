#!/usr/bin/env bun

import { resolveOptions, syncDatabases, type SyncMode, type SyncProgressEvent } from "../src/local-sync";

function printHelp() {
	console.log(`Usage:
  bun run sync:prod-to-local [options]

Options:
  --dry-run                         Inspect changed rows without writing locally
  --table <name>                    Sync one table only
  --source-url <url>                Override production MySQL URL
  --target-url <url>                Override local MySQL URL
  --state-file <path>               Override cursor state file
  --initial-cursor-value <value>     Floor for fresh/stale cursors (default: 2026-05-04 23:59:59.999)
  --reset-cursor                    Ignore saved cursor for the selected table(s)
  --read-batch-size <number>        Source read batch size (default: 10000)
  --write-batch-size <number>       Local upsert batch size (default: 500)
  --refresh-static                  Upsert small tables that have no timestamp cursor
  --static-refresh-max-rows <n>     Max rows for --refresh-static tables (default: 5000)
  -h, --help                        Show this help

Environment:
  PROD_DATABASE_URL or SOURCE_DATABASE_URL for production.
  LOCAL_DATABASE_URL, TARGET_DATABASE_URL, or DATABASE_URL from .env.local for local.

If env vars are not set, the script reads packages/db/.env.production for source
and packages/db/.env.local for target. Without a local URL, it falls back to
mysql://root@127.0.0.1:3307/gnd-prisma2, the Docker MySQL database.`);
}

function printReport(reports: Awaited<ReturnType<typeof syncDatabases>>, dryRun: boolean, startedAt: number) {
	const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
	const totals = reports.reduce(
		(acc, report) => {
			acc.read += report.read;
			acc.written += report.written;
			if (report.mode === "skip") {
				acc.skipped += 1;
			}
			return acc;
		},
		{ read: 0, written: 0, skipped: 0 },
	);

	console.log(`\n${dryRun ? "Dry run" : "Sync"} complete in ${elapsed}s`);
	console.log(`Tables: ${reports.length}, skipped: ${totals.skipped}, rows read: ${totals.read}, rows written: ${totals.written}`);

	for (const report of reports) {
		const status = report.mode === "skip" ? "SKIP" : report.mode.toUpperCase();
		const cursor = report.cursorValue ? ` cursor=${report.cursorValue}` : "";
		const reason = report.skippedReason ? ` - ${report.skippedReason}` : "";
		console.log(`${status.padEnd(14)} ${report.table}: read=${report.read} written=${report.written}${cursor}${reason}`);
	}
}

function formatElapsed(startedAt: number) {
	return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`.padStart(7);
}

function formatMode(mode: SyncMode) {
	return mode.padEnd(14);
}

function formatTable(table: string) {
	return table.length > 32 ? `${table.slice(0, 29)}...` : table.padEnd(32);
}

function createProgressReporter(startedAt: number) {
	return (event: SyncProgressEvent) => {
		const elapsed = formatElapsed(startedAt);

		switch (event.type) {
			case "manifest:start":
				console.log(`[${elapsed}] Inspecting source schema...`);
				break;
			case "manifest":
				console.log(`[${elapsed}] Found ${event.tableCount} table${event.tableCount === 1 ? "" : "s"} to inspect.`);
				break;
			case "table:start":
				console.log(`[${elapsed}] START ${formatMode(event.mode)} ${formatTable(event.table)}`);
				break;
			case "table:batch": {
				const cursor = event.cursorValue ? ` cursor=${event.cursorValue}` : "";
				console.log(
					`[${elapsed}] BATCH ${formatMode(event.mode)} ${formatTable(event.table)} read=${event.read} written=${event.written}${cursor}`,
				);
				break;
			}
			case "table:skip":
				console.log(`[${elapsed}] SKIP  ${formatMode("skip")} ${formatTable(event.table)} ${event.reason}`);
				break;
			case "table:done": {
				const { report } = event;
				const reason = report.skippedReason ? ` - ${report.skippedReason}` : "";
				console.log(
					`[${elapsed}] DONE  ${formatMode(report.mode)} ${formatTable(report.table)} read=${report.read} written=${report.written}${reason}`,
				);
				break;
			}
		}
	};
}

const startedAt = Date.now();

try {
	const options = await resolveOptions(Bun.argv.slice(2));

	if (options.help) {
		printHelp();
		process.exit(0);
	}

	console.log(`${options.dryRun ? "Dry running" : "Syncing"} production DB to local...`);
	console.log(`State file: ${options.stateFile}`);
	if (options.initialCursorValue) {
		console.log(`Initial cursor floor: ${options.initialCursorValue}`);
	}
	if (options.table) {
		console.log(`Table filter: ${options.table}`);
	}
	if (options.resetCursor) {
		console.log("Cursor reset: enabled");
	}

	const reports = await syncDatabases({
		...options,
		onProgress: createProgressReporter(startedAt),
	});
	printReport(reports, options.dryRun, startedAt);
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
