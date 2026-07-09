#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type DevInfraMode = "remote-dev" | "local";

type DevInfraCliOptions = {
	dbMode?: DevInfraMode;
	redisMode?: DevInfraMode;
	command: string[];
};

type ResolveDevInfraOptions = {
	dbMode?: DevInfraMode;
	redisMode?: DevInfraMode;
};

const DEFAULT_LOCAL_DATABASE_URL = "mysql://root@127.0.0.1:3307/gnd-prisma2";
const DEFAULT_LOCAL_REDIS_URL = "redis://localhost:6379";
const DEV_CACHE_NAMESPACE = "dev";
const LOCAL_CACHE_NAMESPACE = "local";

export function parseEnvText(text: string): Record<string, string> {
	const values: Record<string, string> = {};

	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
		if (!match) {
			continue;
		}

		const key = match[1];
		const value = match[2];
		if (!key || value == null) {
			continue;
		}

		values[key] = stripWrappingQuotes(value.trim());
	}

	return values;
}

export function loadEnvFiles(files: string[]): Record<string, string> {
	const values: Record<string, string> = {};

	for (const file of files) {
		try {
			Object.assign(values, parseEnvText(readFileSync(file, "utf8")));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
				throw error;
			}
		}
	}

	return values;
}

export function findWorkspaceRoot(startDir: string): string {
	let dir = resolve(startDir);

	while (true) {
		try {
			const packageJson = JSON.parse(
				readFileSync(resolve(dir, "package.json"), "utf8"),
			) as { workspaces?: unknown };

			if (packageJson.workspaces) {
				return dir;
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
				throw error;
			}
		}

		const parent = dirname(dir);
		if (parent === dir) {
			return resolve(startDir);
		}
		dir = parent;
	}
}

export function envFilesForCwd(cwd: string): string[] {
	const workspaceRoot = findWorkspaceRoot(cwd);
	const resolvedCwd = resolve(cwd);
	const files = [
		resolve(workspaceRoot, ".env"),
		resolve(workspaceRoot, ".env.local"),
	];

	if (resolvedCwd !== workspaceRoot) {
		files.push(resolve(resolvedCwd, ".env"), resolve(resolvedCwd, ".env.local"));
	}

	return files;
}

export function resolveDevInfraEnv(
	inputEnv: Record<string, string | undefined>,
	options: ResolveDevInfraOptions = {},
): Record<string, string | undefined> {
	const dbMode = normalizeMode(options.dbMode ?? inputEnv.GND_DB_MODE ?? "remote-dev", "GND_DB_MODE");
	const redisMode = normalizeMode(options.redisMode ?? inputEnv.GND_REDIS_MODE ?? "remote-dev", "GND_REDIS_MODE");
	const env: Record<string, string | undefined> = { ...inputEnv };

	const databaseUrl =
		dbMode === "local"
			? firstEnvValue(env, ["LOCAL_DATABASE_URL"]) ?? DEFAULT_LOCAL_DATABASE_URL
			: firstEnvValue(env, ["REMOTE_DEV_DATABASE_URL", "DEV_DATABASE_URL"]) ?? nonLocalEnvValue(env, "DATABASE_URL");

	if (!databaseUrl) {
		throw new Error("Missing remote dev database URL. Set REMOTE_DEV_DATABASE_URL, DEV_DATABASE_URL, or DATABASE_URL.");
	}

	env.GND_DB_MODE = dbMode;
	env.DATABASE_URL = databaseUrl;
	env.GND_START_MYSQL = dbMode === "local" ? "1" : "auto";
	if (dbMode === "local") {
		env.LOCAL_DATABASE_URL = databaseUrl;
	} else {
		env.REMOTE_DEV_DATABASE_URL = databaseUrl;
	}

	if (redisMode === "local") {
		const redisUrl = firstEnvValue(env, ["LOCAL_REDIS_URL"]) ?? DEFAULT_LOCAL_REDIS_URL;
		env.GND_REDIS_MODE = "local";
		env.REDIS_URL = redisUrl;
		env.LOCAL_REDIS_URL = redisUrl;
		env.GND_START_REDIS = "1";
		env.GND_CACHE_NAMESPACE = LOCAL_CACHE_NAMESPACE;
		env.UPSTASH_REDIS_REST_URL = undefined;
		env.UPSTASH_REDIS_REST_TOKEN = undefined;
	} else {
		const remoteRedisUrl = firstEnvValue(env, ["REMOTE_DEV_REDIS_URL"]) ?? nonLocalEnvValue(env, "REDIS_URL");
		const remoteRestUrl = firstEnvValue(env, ["REMOTE_DEV_UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_URL"]);
		const remoteRestToken = firstEnvValue(env, ["REMOTE_DEV_UPSTASH_REDIS_REST_TOKEN", "UPSTASH_REDIS_REST_TOKEN"]);

		if (!remoteRedisUrl && !remoteRestUrl) {
			throw new Error(
				"Missing remote dev Redis configuration. Set REMOTE_DEV_REDIS_URL or REMOTE_DEV_UPSTASH_REDIS_REST_URL.",
			);
		}
		if (remoteRestUrl && !remoteRestToken && !remoteRedisUrl) {
			throw new Error("Missing remote dev Upstash Redis REST token. Set REMOTE_DEV_UPSTASH_REDIS_REST_TOKEN.");
		}

		env.GND_REDIS_MODE = "remote-dev";
		env.GND_START_REDIS = "auto";
		env.GND_CACHE_NAMESPACE = DEV_CACHE_NAMESPACE;

		if (remoteRedisUrl) {
			env.REDIS_URL = remoteRedisUrl;
			env.REMOTE_DEV_REDIS_URL = remoteRedisUrl;
		} else {
			env.REDIS_URL = undefined;
		}

		if (remoteRestUrl) {
			env.UPSTASH_REDIS_REST_URL = remoteRestUrl;
			env.REMOTE_DEV_UPSTASH_REDIS_REST_URL = remoteRestUrl;
		} else {
			env.UPSTASH_REDIS_REST_URL = undefined;
		}

		if (remoteRestToken) {
			env.UPSTASH_REDIS_REST_TOKEN = remoteRestToken;
			env.REMOTE_DEV_UPSTASH_REDIS_REST_TOKEN = remoteRestToken;
		} else {
			env.UPSTASH_REDIS_REST_TOKEN = undefined;
		}
	}

	return env;
}

function stripWrappingQuotes(value: string): string {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1);
	}

	return value;
}

function firstEnvValue(
	env: Record<string, string | undefined>,
	keys: string[],
): string | undefined {
	for (const key of keys) {
		const value = env[key];
		if (value) {
			return value;
		}
	}

	return undefined;
}

function nonLocalEnvValue(
	env: Record<string, string | undefined>,
	key: string,
): string | undefined {
	const value = env[key];
	return value && !isLocalUrl(value) ? value : undefined;
}

function isLocalUrl(value: string): boolean {
	try {
		const hostname = new URL(value).hostname;
		return ["localhost", "127.0.0.1", "::1", "0.0.0.0", "mysql"].includes(hostname);
	} catch {
		return false;
	}
}

function normalizeMode(value: string, name: string): DevInfraMode {
	if (value === "remote-dev" || value === "local") {
		return value;
	}

	throw new Error(`Invalid ${name} value: ${value}. Expected remote-dev or local.`);
}

function parseCliArgs(argv: string[]): DevInfraCliOptions {
	const options: DevInfraCliOptions = { command: [] };
	let index = 0;

	while (index < argv.length) {
		const arg = argv[index];
		if (!arg) break;
		if (arg === "--") {
			options.command = argv.slice(index + 1);
			break;
		}

		const next = () => {
			index += 1;
			const value = argv[index];
			if (!value || value.startsWith("--")) {
				throw new Error(`Missing value for ${arg}`);
			}
			return value;
		};

		switch (arg) {
			case "--db":
				options.dbMode = normalizeMode(next(), "GND_DB_MODE");
				break;
			case "--redis":
				options.redisMode = normalizeMode(next(), "GND_REDIS_MODE");
				break;
			default:
				options.command = argv.slice(index);
				index = argv.length;
				continue;
		}

		index += 1;
	}

	if (options.command.length === 0) {
		throw new Error("Missing command. Use: bun scripts/with-dev-infra.ts [--db mode] [--redis mode] -- <command>");
	}

	return options;
}

async function main() {
	const cli = parseCliArgs(Bun.argv.slice(2));
	const fileEnv = loadEnvFiles(envFilesForCwd(process.cwd()));
	const env = resolveDevInfraEnv(
		{
			...fileEnv,
			...process.env,
		},
		{
			dbMode: cli.dbMode,
			redisMode: cli.redisMode,
		},
	);
	const child = Bun.spawn(cli.command, {
		env,
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});

	process.exit(await child.exited);
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
