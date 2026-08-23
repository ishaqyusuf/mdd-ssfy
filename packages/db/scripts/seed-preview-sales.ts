#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parseEnvFile } from "../src/local-sync";
import {
	parsePreviewSalesSeedArgs,
	redactPreviewDatabaseUrl,
	seedPreviewSales,
} from "../src/preview-sales-seed";

function printHelp() {
	console.log(`Usage:
  bun run db:seed-preview-sales -- --source-url <local-url> --target-url <preview-url> [options]

Options:
  --limit <100-200>                    Sales orders to select (default: 150)
  --dry-run                            Inspect and fingerprint without writing
  --source-env-file <path>             Read source DATABASE_URL without exposing it in argv
  --target-env-file <path>             Read target DATABASE_URL without exposing it in argv
  --target-clipboard                   Read a PlanetScale URL/snippet from the macOS clipboard
  --target-loopback                    Accept the URL once over a tokenized localhost endpoint
  --expect-target-fingerprint <value>  Required for writes; copy from dry-run output
  --allow-existing                     Allow repeatable upsert into a non-empty preview target
  -h, --help                           Show this help

The source must be local MySQL. The target must be PlanetScale. Customer/address PII,
tokens, provider links, sessions, refunds, and external payment payloads are excluded
or sanitized. Employee emails and password hashes are retained so local logins work.`);
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
	printHelp();
	process.exit(0);
}

async function consumeEnvFileFlag(flag: string): Promise<string | undefined> {
	const index = args.indexOf(flag);
	if (index < 0) return undefined;
	const path = args[index + 1];
	if (!path || path.startsWith("--"))
		throw new Error(`Missing value for ${flag}`);
	args.splice(index, 2);
	const parsed = parseEnvFile(await readFile(path, "utf8"));
	if (!parsed.DATABASE_URL)
		throw new Error(`${path} does not contain DATABASE_URL`);
	return parsed.DATABASE_URL;
}

const sourceUrl = await consumeEnvFileFlag("--source-env-file");
let targetUrl = await consumeEnvFileFlag("--target-env-file");
const clipboardIndex = args.indexOf("--target-clipboard");
if (clipboardIndex >= 0) {
	args.splice(clipboardIndex, 1);
	const clipboard = Bun.spawnSync(["pbpaste"]);
	if (!clipboard.success) throw new Error("Unable to read the macOS clipboard");
	const raw = clipboard.stdout.toString();
	const match = raw.match(/mysql:\/\/[^\s'\"]+/);
	if (!match)
		throw new Error(
			"Clipboard does not contain a PlanetScale MySQL URL or DATABASE_URL snippet",
		);
	targetUrl = match[0];
}
const loopbackIndex = args.indexOf("--target-loopback");
if (loopbackIndex >= 0) {
	args.splice(loopbackIndex, 1);
	targetUrl = await new Promise<string>((resolve, reject) => {
		const token = randomUUID();
		const timeout = setTimeout(() => {
			server.stop(true);
			reject(
				new Error("Timed out waiting for the one-time Preview database URL"),
			);
		}, 120_000);
		const server = Bun.serve({
			hostname: "127.0.0.1",
			port: 48713,
			async fetch(request) {
				const url = new URL(request.url);
				if (request.method !== "POST" || url.pathname !== `/${token}`) {
					return new Response("Not found", { status: 404 });
				}
				const raw = await request.text();
				const match = raw.match(/mysql:\/\/[^\s'\"]+/);
				if (!match)
					return new Response("Invalid PlanetScale URL", { status: 400 });
				clearTimeout(timeout);
				setTimeout(() => server.stop(true), 0);
				resolve(match[0]);
				return new Response("Accepted", { status: 202 });
			},
		});
		console.log(
			`Awaiting one-time Preview credential at ${server.url}${token}`,
		);
	});
}
const options = parsePreviewSalesSeedArgs(args, {
	...process.env,
	...(sourceUrl ? { SOURCE_DATABASE_URL: sourceUrl } : {}),
	...(targetUrl ? { PREVIEW_DATABASE_URL: targetUrl } : {}),
});
console.log(`Source: ${redactPreviewDatabaseUrl(options.sourceUrl)}`);
console.log(`Target: ${redactPreviewDatabaseUrl(options.targetUrl)}`);
console.log(
	`Mode: ${options.dryRun ? "dry-run" : "write"}; order limit: ${options.limit}`,
);

const report = await seedPreviewSales(options);
console.log(`Target credential fingerprint: ${report.targetFingerprint}`);
console.log(
	`Target sales orders: before=${report.targetOrdersBefore} after=${report.targetOrdersAfter}`,
);
console.log(
	`Selected: orders=${report.selectedOrders} internal users=${report.selectedUsers}`,
);
console.log("Rows by model:");
for (const [model, count] of Object.entries(report.rowsByModel)) {
	const written = report.writtenByModel[model];
	console.log(
		`  ${model}: selected=${count}${written == null ? "" : ` written=${written}`}`,
	);
}

if (report.dryRun) {
	console.log(
		`\nDry run complete. To authorize the write, rerun without --dry-run and add:\n  --expect-target-fingerprint ${report.targetFingerprint}`,
	);
}
