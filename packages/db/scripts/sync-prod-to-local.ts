#!/usr/bin/env bun

import { resolveOptions, syncDatabases } from "../src/local-sync";

function printHelp() {
	console.log(`Usage:
  bun run sync:prod-to-local [options]

Options:
  --dry-run                         Inspect changed rows without writing locally
  --table <name>                    Sync one table only
  --source-url <url>                Override production MySQL URL
  --target-url <url>                Override local MySQL URL
  --state-file <path>               Override cursor state file
  --read-batch-size <number>        Source read batch size (default: 10000)
  --write-batch-size <number>       Local upsert batch size (default: 500)
  --refresh-static                  Upsert small tables that have no timestamp cursor
  --static-refresh-max-rows <n>     Max rows for --refresh-static tables (default: 5000)
  -h, --help                        Show this help

Environment:
  PROD_DATABASE_URL or SOURCE_DATABASE_URL for production.
  LOCAL_DATABASE_URL or TARGET_DATABASE_URL for local.

If env vars are not set, the script reads packages/db/.env.production for source
and packages/db/.env for target.`);
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

const startedAt = Date.now();

try {
	const options = await resolveOptions(Bun.argv.slice(2));

	if (options.help) {
		printHelp();
		process.exit(0);
	}

	const reports = await syncDatabases(options);
	printReport(reports, options.dryRun, startedAt);
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
