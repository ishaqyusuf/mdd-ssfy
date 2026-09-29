#!/usr/bin/env bun
import { execFileSync } from "node:child_process";
import { copyFileSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { relative, resolve } from "node:path";
import { checkRelease } from "../.release/release-adapter";
import { isGenuineReleaseGate } from "../.release/toolkit/9a324b2c4e759d4713375e7853ef7d791c357552/src/release/gate";
import { verifyVendorSnapshot } from "../.release/toolkit/9a324b2c4e759d4713375e7853ef7d791c357552/src/release/vendor";

function value(name: string) {
	const index = Bun.argv.indexOf(name);
	const found = index >= 0 ? Bun.argv[index + 1] : undefined;
	if (!found) throw new Error(`Missing ${name}.`);
	return found;
}

try {
	const environment = value("--env");
	if (!["preview", "production"].includes(environment)) {
		throw new Error("Use --env preview or --env production.");
	}
	const source = realpathSync(resolve(value("--repo")));
	const trusted = realpathSync(resolve(import.meta.dir, ".."));
	const sourceManifest = resolve(source, "release.manifest.json");
	if (!lstatSync(sourceManifest).isFile()) {
		throw new Error("Candidate release manifest must be a regular file.");
	}
	copyFileSync(resolve(trusted, "release.manifest.json"), sourceManifest);
	const revision = execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: source,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "ignore"],
	}).trim();
	const lock = verifyVendorSnapshot(trusted);
	const evidencePath = resolve(trusted, value("--evidence"));
	if (relative(trusted, evidencePath).startsWith("..")) {
		throw new Error("Signed evidence must stay in the trusted checkout.");
	}
	process.env.GND_RELEASE_EVIDENCE_ENVELOPE = readFileSync(
		evidencePath,
		"utf8",
	);
	const report = await checkRelease({
		environment: environment as "preview" | "production",
		revision,
		repository: source,
		toolkitRevision: lock.toolkitRevision,
	});
	if (!isGenuineReleaseGate(report) || report.revision !== revision) {
		throw new Error("Trusted release gate returned invalid output.");
	}
	console.log(JSON.stringify(report));
	if (!report.ready) process.exitCode = 1;
} catch (error) {
	console.error(
		error instanceof Error ? error.message : "Trusted release gate failed.",
	);
	process.exitCode = 2;
}
