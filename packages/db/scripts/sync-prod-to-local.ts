#!/usr/bin/env bun

import { clearScreenDown, cursorTo, emitKeypressEvents, moveCursor } from "node:readline";
import { createInterface } from "node:readline/promises";
import {
	type DuplicateConflictAction,
	type DuplicateConflictContext,
	type DuplicateConflictPolicy,
	type SyncMode,
	type SyncProgressEvent,
	redactDatabaseUrl,
	resolveOptions,
	syncDatabases,
} from "../src/local-sync";

type DuplicatePromptChoice = {
	action: DuplicateConflictAction;
	key: string;
	label: string;
	description: string;
	disabled?: boolean;
};

function printHelp() {
	console.log(`Usage:
  bun run db:sync [options]

Options:
  --dry-run                         Inspect changed rows without writing
  --table <name>                    Sync one table only
  --source-url <url>                Override production MySQL URL
  --target-url <url>                Override target MySQL URL
  --target-mode <mode>              Target profile: local or remote-dev
  --state-file <path>               Override cursor state file
  --initial-cursor-value <value>     Floor for fresh/stale cursors (default: 2026-05-04 23:59:59.999)
  --reset-cursor                    Ignore saved cursor for the selected table(s)
  --read-batch-size <number>        Source read batch size (default: 10000)
  --write-batch-size <number>       Local upsert batch size (default: 500)
  --refresh-static                  Upsert small tables that have no timestamp cursor
  --static-refresh-max-rows <n>     Max rows for --refresh-static tables (default: 5000)
  --on-duplicate <mode>             Duplicate-key recovery: prompt, ignore, reset, cancel (default: prompt in TTY, cancel otherwise)
  -h, --help                        Show this help

Environment:
  DATABASE_URL in .env.production for production source.
  DATABASE_URL in .env.local for local targets.
  DATABASE_URL in .env.remote.local for hosted dev targets.
  GND_ALLOW_REMOTE_DEV_DB_SYNC=1 is required before writing to remote-dev.

If env vars are not set, the script reads packages/db/.env.production for source
and the selected mode file for target. Local mode falls back to
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

function formatMode(mode: SyncMode | "reset") {
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
			case "table:reset":
				console.log(`[${elapsed}] RESET ${formatMode("reset")} ${formatTable(event.table)} ${event.reason}`);
				break;
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

function createDuplicateConflictResolver(policy: DuplicateConflictPolicy) {
	return async (context: DuplicateConflictContext): Promise<DuplicateConflictAction> => {
		if (policy !== "prompt") {
			if (policy === "reset") {
				console.warn(
					`Duplicate-key conflict in ${context.table}; --on-duplicate reset will delete and fully reimport the local ${context.table} table.`,
				);
			}
			return policy;
		}

		if (!process.stdin.isTTY) {
			console.warn(`Duplicate-key conflict in ${context.table}; stdin is not interactive, so the sync will cancel.`);
			return "cancel";
		}

		return promptForDuplicateConflict(context);
	};
}

async function promptForDuplicateConflict(context: DuplicateConflictContext): Promise<DuplicateConflictAction> {
	console.error("");
	console.error(`Duplicate-key conflict while syncing ${context.table} (${context.mode}).`);
	console.error(`Rows read: ${context.read}, rows written: ${context.written}`);
	if (context.cursorValue) {
		console.error(`Cursor: ${context.cursorValue}`);
	}
	console.error(context.message);

	if (process.stdin.setRawMode && process.stdout.isTTY) {
		return selectDuplicateConflictAction(context);
	}

	return promptForDuplicateConflictText(context);
}

function getDuplicatePromptChoices(context: DuplicateConflictContext): DuplicatePromptChoice[] {
	return [
		{
			action: "ignore",
			key: "i",
			label: "Ignore",
			description: "skip this table for this run and continue to the next table",
		},
		{
			action: "reset",
			key: "r",
			label: "Reset",
			description: `delete and fully reimport only the local ${context.table} table`,
			disabled: context.resetAttempted,
		},
		{
			action: "cancel",
			key: "c",
			label: "Cancel",
			description: "stop the sync now",
		},
	];
}

async function selectDuplicateConflictAction(context: DuplicateConflictContext): Promise<DuplicateConflictAction> {
	const choices = getDuplicatePromptChoices(context);
	let selectedIndex = choices.findIndex((choice) => !choice.disabled);
	if (selectedIndex < 0) {
		selectedIndex = choices.length - 1;
	}
	let renderedLines = 0;
	const wasRaw = process.stdin.isRaw;

	return new Promise<DuplicateConflictAction>((resolve) => {
		const cleanup = () => {
			process.stdin.off("keypress", onKeypress);
			process.stdin.setRawMode?.(Boolean(wasRaw));
		};
		const finish = (action: DuplicateConflictAction) => {
			cleanup();
			if (renderedLines > 0) {
				moveCursor(process.stdout, 0, -renderedLines);
				cursorTo(process.stdout, 0);
				clearScreenDown(process.stdout);
			}
			const choice = choices.find((item) => item.action === action);
			console.log(`Selected: ${choice?.label ?? action}`);
			resolve(action);
		};
		const moveSelection = (direction: 1 | -1) => {
			for (let step = 0; step < choices.length; step += 1) {
				selectedIndex = (selectedIndex + direction + choices.length) % choices.length;
				if (!choices[selectedIndex]?.disabled) {
					break;
				}
			}
			render();
		};
		const render = () => {
			if (renderedLines > 0) {
				moveCursor(process.stdout, 0, -renderedLines);
				cursorTo(process.stdout, 0);
				clearScreenDown(process.stdout);
			}

			const lines = [
				"Choose a recovery action with Up/Down, then Enter:",
				...choices.map((choice, index) => {
					const marker = index === selectedIndex ? ">" : " ";
					const shortcut = `[${choice.key}]`;
					const disabled = choice.disabled ? " unavailable" : "";
					return `${marker} ${shortcut} ${choice.label.padEnd(7)} ${choice.description}${disabled}`;
				}),
				"Shortcuts: i ignore, r reset, c cancel. Ctrl+C cancels.",
			];
			process.stdout.write(`${lines.join("\n")}\n`);
			renderedLines = lines.length;
		};
		const onKeypress = (_text: string, key: { name?: string; ctrl?: boolean }) => {
			if (key.ctrl && key.name === "c") {
				finish("cancel");
				return;
			}
			if (key.name === "up") {
				moveSelection(-1);
				return;
			}
			if (key.name === "down") {
				moveSelection(1);
				return;
			}
			if (key.name === "return" || key.name === "enter") {
				const selected = choices[selectedIndex];
				if (selected && !selected.disabled) {
					finish(selected.action);
				}
				return;
			}

			const shortcut = choices.find((choice) => choice.key === key.name && !choice.disabled);
			if (shortcut) {
				finish(shortcut.action);
			}
		};

		emitKeypressEvents(process.stdin);
		process.stdin.setRawMode?.(true);
		process.stdin.resume();
		process.stdin.on("keypress", onKeypress);
		render();
	});
}

async function promptForDuplicateConflictText(context: DuplicateConflictContext): Promise<DuplicateConflictAction> {
	if (context.resetAttempted) {
		console.error("Reset has already been tried for this table in this sync run.");
	} else {
		console.error(`[reset] deletes and fully reimports only the local ${context.table} table.`);
	}

	const readline = createInterface({ input: process.stdin, output: process.stdout });
	try {
		while (true) {
			const answer = (await readline.question("Choose [ignore] next table, [reset] table, or [cancel] sync: ")).trim().toLowerCase();

			if (answer === "ignore" || answer === "i") {
				return "ignore";
			}
			if ((answer === "reset" || answer === "r") && !context.resetAttempted) {
				return "reset";
			}
			if (answer === "cancel" || answer === "c" || answer === "") {
				return "cancel";
			}

			const resetHint = context.resetAttempted ? " Reset is no longer available for this table." : "";
			console.error(`Enter ignore, reset, or cancel.${resetHint}`);
		}
	} finally {
		readline.close();
	}
}

const startedAt = Date.now();

try {
	const options = await resolveOptions(Bun.argv.slice(2));

	if (options.help) {
		printHelp();
		process.exit(0);
	}

	console.log(`${options.dryRun ? "Dry running" : "Syncing"} production DB to ${options.targetMode}...`);
	console.log(`Source: ${redactDatabaseUrl(options.sourceUrl)}`);
	console.log(`Target: ${redactDatabaseUrl(options.targetUrl)}`);
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
	if (options.onDuplicate === "prompt" && !process.stdin.isTTY) {
		console.log("Duplicate recovery: cancel (non-interactive stdin)");
	} else {
		console.log(`Duplicate recovery: ${options.onDuplicate}`);
	}

	const reports = await syncDatabases({
		...options,
		onDuplicateConflict: createDuplicateConflictResolver(options.onDuplicate),
		onProgress: createProgressReporter(startedAt),
	});
	printReport(reports, options.dryRun, startedAt);
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
