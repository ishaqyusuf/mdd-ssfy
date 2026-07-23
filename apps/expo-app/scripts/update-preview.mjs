#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const versionFile = resolve(appRoot, "app.config.ts");
const versionPattern =
	/export\s+const\s+UPDATE_VERSION\s*=\s*"(\d{4}\.\d{2}\.\d{2}(?:\.\d{2})?)";/;

function parseArgs(argv) {
	const args = {
		current: null,
		date: null,
		dryRun: false,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--dry-run") {
			args.dryRun = true;
		} else if (arg === "--current") {
			args.current = argv[index + 1];
			if (!args.current) {
				throw new Error("Missing value for --current.");
			}
			index += 1;
		} else if (arg === "--date") {
			args.date = argv[index + 1];
			if (!args.date) {
				throw new Error("Missing value for --date.");
			}
			index += 1;
		}
	}

	return args;
}

function formatLocalDate(date = new Date()) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}.${month}.${day}`;
}

function normalizeDateArg(dateArg) {
	if (!dateArg) return formatLocalDate();
	if (/^\d{4}\.\d{2}\.\d{2}$/.test(dateArg)) return dateArg;
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) return dateArg.replaceAll("-", ".");

	throw new Error(`Invalid --date value "${dateArg}". Use YYYY-MM-DD or YYYY.MM.DD.`);
}

function readCurrentVersion() {
	const source = readFileSync(versionFile, "utf8");
	const match = source.match(versionPattern);

	if (!match) {
		throw new Error(`Could not find UPDATE_VERSION in ${versionFile}.`);
	}

	return {
		source,
		version: match[1],
	};
}

function getNextUpdateVersion(currentVersion, today = formatLocalDate()) {
	const currentPattern = /^(\d{4}\.\d{2}\.\d{2})(?:\.(\d{2}))?$/;
	const match = currentVersion.match(currentPattern);

	if (!match) {
		throw new Error(
			`Invalid UPDATE_VERSION "${currentVersion}". Use YYYY.MM.DD or YYYY.MM.DD.CC.`,
		);
	}

	const [, currentDate, currentCount] = match;
	if (currentDate !== today) return today;
	if (!currentCount) return `${today}.01`;

	const nextCount = Number(currentCount) + 1;
	if (nextCount > 99) {
		throw new Error(`Daily update counter for ${today} exceeded 99.`);
	}

	return `${today}.${String(nextCount).padStart(2, "0")}`;
}

function updateVersionFile(source, nextVersion) {
	const nextSource = source.replace(
		versionPattern,
		`export const UPDATE_VERSION = "${nextVersion}";`,
	);

	writeFileSync(versionFile, nextSource);
}

function publishUpdate(nextVersion) {
	const result = spawnSync(
		"bun",
		[
			"run",
			"with-env:prod",
			"env",
			"-u",
			"EXPO_PUBLIC_EMAIL",
			"-u",
			"EXPO_PUBLIC_TOK",
			"EXPO_NO_DOTENV=1",
			"eas",
			"update",
			"--channel",
			"preview",
			"--platform",
			"android",
			"--environment",
			"preview",
			"--message",
			`OTA update ${nextVersion}`,
		],
		{
			cwd: appRoot,
			stdio: "inherit",
		},
	);

	if (result.error) throw result.error;
	if (result.status !== 0) {
		throw new Error(`eas update failed with exit code ${result.status}.`);
	}
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.current && !args.dryRun) {
		throw new Error("--current is only supported with --dry-run.");
	}

	const today = normalizeDateArg(args.date);
	const fileState = args.current ? null : readCurrentVersion();
	const currentVersion = args.current ?? fileState.version;
	const nextVersion = getNextUpdateVersion(currentVersion, today);

	if (args.dryRun) {
		console.log(`${currentVersion} -> ${nextVersion}`);
		return;
	}

	updateVersionFile(fileState.source, nextVersion);
	publishUpdate(nextVersion);
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
