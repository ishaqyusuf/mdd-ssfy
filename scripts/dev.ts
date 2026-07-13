#!/usr/bin/env bun

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { findWorkspaceRoot } from "./with-dev-infra";

type DevProfile = "local" | "remote-dev" | "prod";

type DevFilterOptions = {
	targets: string[];
};

type DevCliOptions = {
	profile: DevProfile;
	filters?: DevFilterOptions;
};

type WorkspacePackage = {
	name: string;
	relativeDir: string;
};

const PROFILE_FLAGS = new Map<string, DevProfile>([
	["--local", "local"],
	["--remote-dev", "remote-dev"],
	["--prod", "prod"],
]);
const FILTER_FLAGS = new Set(["--filter", "--f", "-f", "-filter"]);

let cachedWorkspacePackageEntries: WorkspacePackage[] | undefined;

export function parseArgs(argv: string[]): DevCliOptions {
	let profile: DevProfile = "local";
	let explicitProfile: DevProfile | undefined;
	let filters: DevFilterOptions | undefined;
	let index = 0;

	while (index < argv.length) {
		const arg = argv[index];
		if (!arg) break;

		const nextProfile = PROFILE_FLAGS.get(arg);
		if (nextProfile) {
			if (explicitProfile && explicitProfile !== nextProfile) {
				throw new Error(
					`Conflicting dev flags: --${explicitProfile} and --${nextProfile}. Choose one profile.`,
				);
			}

			explicitProfile = nextProfile;
			profile = nextProfile;
			index += 1;
			continue;
		}

		if (FILTER_FLAGS.has(arg)) {
			const targets: string[] = [];
			index += 1;

			while (index < argv.length) {
				const target = argv[index];
				if (!target || isFlagBoundary(target)) {
					break;
				}
				targets.push(normalizeTurboFilter(target));
				index += 1;
			}

			if (targets.length === 0) {
				throw new Error(`Missing targets for ${arg}.`);
			}

			filters = {
				targets: [...(filters?.targets ?? []), ...targets],
			};
			continue;
		}

		throw new Error(
			`Unknown dev flag: ${arg}. Use --local, --remote-dev, --prod, or --filter/--f/-f/-filter.`,
		);
	}

	if (filters) {
		validateFilterTargets(filters.targets);
	}

	return { profile, ...(filters ? { filters } : {}) };
}

export function commandForProfile(
	profile: DevProfile,
	filters?: DevFilterOptions,
): string[] {
	const turboFilterArgs = buildTurboFilterArgs(filters);

	switch (profile) {
		case "local":
			return [
				"bun",
				"scripts/with-dev-infra.ts",
				"--db",
				"local",
				"--redis",
				"local",
				"--",
				"bun",
				"scripts/dev-run.ts",
				...turboFilterArgs,
			];
		case "remote-dev":
			return [
				"bun",
				"scripts/with-dev-infra.ts",
				"--db",
				"remote-dev",
				"--redis",
				"remote-dev",
				"--",
				"bun",
				"scripts/dev-run.ts",
				...turboFilterArgs,
			];
		case "prod":
			return [
				"turbo",
				"dev:prod",
				"--parallel",
				...(turboFilterArgs.length > 0
					? turboFilterArgs
					: ["--filter", "@gnd/www", "--filter", "@gnd/api"]),
			];
	}
}

function normalizeTurboFilter(target: string): string {
	const hasPrefixExclusion = target.startsWith("!");
	const hasSuffixExclusion =
		target.endsWith("!") && target.length > 1 && !hasPrefixExclusion;
	const innerTarget = hasPrefixExclusion
		? target.slice(1)
		: hasSuffixExclusion
			? target.slice(0, -1)
			: target;
	const resolvedTarget = resolveBarePackageFilter(innerTarget);

	if (hasPrefixExclusion || hasSuffixExclusion) {
		return `!${resolvedTarget}`;
	}

	return resolvedTarget;
}

function isFlagBoundary(target: string): boolean {
	return (
		target.startsWith("--") ||
		PROFILE_FLAGS.has(target) ||
		FILTER_FLAGS.has(target)
	);
}

function validateFilterTargets(targets: string[]) {
	const exactPackageTargets = targets
		.map(stripFilterNegation)
		.filter(isExactPackageFilter);
	if (exactPackageTargets.length === 0) {
		return;
	}

	const validPackages = workspacePackages();
	const validPackageSet = new Set(validPackages);
	const missingPackages = exactPackageTargets.filter(
		(target) => !validPackageSet.has(target),
	);

	if (missingPackages.length === 0) {
		return;
	}

	throw new Error(
		[
			`Unknown dev filter package${missingPackages.length === 1 ? "" : "s"}: ${missingPackages.join(", ")}`,
			formatAvailablePackagesByWorkspace(),
		].join("\n"),
	);
}

function stripFilterNegation(target: string): string {
	return target.startsWith("!") ? target.slice(1) : target;
}

function resolveBarePackageFilter(target: string): string {
	if (target.startsWith("@") || !isExactPackageFilter(target)) {
		return target;
	}

	const matchingPackages = workspacePackages().filter(
		(packageName) => packageName === target || packageName.endsWith(`/${target}`),
	);

	if (matchingPackages.length === 1 && matchingPackages[0]) {
		return matchingPackages[0];
	}

	if (matchingPackages.length > 1) {
		throw new Error(
			`Ambiguous dev filter package: ${target}. Matches: ${matchingPackages.join(", ")}`,
		);
	}

	return target;
}

function isExactPackageFilter(target: string): boolean {
	return (
		target.length > 0 &&
		!target.startsWith(".") &&
		!target.includes("*") &&
		!target.includes("...") &&
		!target.includes("^") &&
		!target.includes("{") &&
		!target.includes("}") &&
		!target.includes("[") &&
		!target.includes("]")
	);
}

function workspacePackages(): string[] {
	return workspacePackageEntries().map(
		(workspacePackage) => workspacePackage.name,
	);
}

function workspacePackageEntries(): WorkspacePackage[] {
	cachedWorkspacePackageEntries ??= readWorkspacePackageEntries();
	return cachedWorkspacePackageEntries;
}

function readWorkspacePackageEntries(): WorkspacePackage[] {
	const workspaceRoot = findWorkspaceRoot(process.cwd());
	const packageJson = JSON.parse(
		readFileSync(resolve(workspaceRoot, "package.json"), "utf8"),
	) as { workspaces?: unknown };
	const workspaces = Array.isArray(packageJson.workspaces)
		? packageJson.workspaces.filter((workspace): workspace is string => typeof workspace === "string")
		: [];

	const workspacePackages = new Map<string, WorkspacePackage>();
	for (const workspace of workspaces) {
		if (workspace.startsWith("!")) {
			continue;
		}

		for (const packageDir of expandWorkspace(workspaceRoot, workspace)) {
			const packageJsonPath = resolve(packageDir, "package.json");
			if (!existsSync(packageJsonPath)) {
				continue;
			}

			const workspacePackage = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
				name?: unknown;
			};
			if (typeof workspacePackage.name === "string") {
				workspacePackages.set(workspacePackage.name, {
					name: workspacePackage.name,
					relativeDir: relative(workspaceRoot, packageDir),
				});
			}
		}
	}

	return [...workspacePackages.values()].sort((a, b) =>
		a.name.localeCompare(b.name),
	);
}

function formatAvailablePackagesByWorkspace() {
	const entries = workspacePackageEntries();
	const apps = entries.filter((entry) => entry.relativeDir.startsWith("apps/"));
	const packages = entries.filter((entry) =>
		entry.relativeDir.startsWith("packages/"),
	);
	const other = entries.filter(
		(entry) =>
			!entry.relativeDir.startsWith("apps/") &&
			!entry.relativeDir.startsWith("packages/"),
	);
	const sections = [
		formatPackageGroup("apps/", apps),
		formatPackageGroup("packages/", packages),
		other.length > 0 ? formatPackageGroup("other/", other) : null,
	].filter((section): section is string => Boolean(section));

	return ["Available packages:", ...sections].join("\n");
}

function formatPackageGroup(label: string, entries: WorkspacePackage[]) {
	if (entries.length === 0) {
		return `${label}:\n  (none)`;
	}

	return `${label}:\n${entries
		.map((entry) => `  ${entry.name}`)
		.join("\n")}`;
}

function expandWorkspace(workspaceRoot: string, workspace: string): string[] {
	if (!workspace.endsWith("/*")) {
		return [resolve(workspaceRoot, workspace)];
	}

	const parentDir = resolve(workspaceRoot, workspace.slice(0, -2));
	if (!existsSync(parentDir)) {
		return [];
	}

	return readdirSync(parentDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => resolve(parentDir, entry.name));
}

function buildTurboFilterArgs(filters?: DevFilterOptions): string[] {
	if (!filters) {
		return [];
	}

	return filters.targets.flatMap((target) => [
		"--filter",
		target,
	]);
}

async function main() {
	const options = parseArgs(Bun.argv.slice(2));
	const child = Bun.spawn(commandForProfile(options.profile, options.filters), {
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
