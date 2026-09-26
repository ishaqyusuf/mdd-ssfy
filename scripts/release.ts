#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const lock = JSON.parse(
	readFileSync(resolve(root, ".release/toolkit.lock.json"), "utf8"),
) as { toolkitRevision?: string };
const revision = lock.toolkitRevision;
if (!revision || !/^[0-9a-f]{40}$/i.test(revision)) {
	console.error("Release toolkit lock is invalid.");
	process.exit(2);
}

const [command, ...args] = Bun.argv.slice(2);
const entry =
	command === "ci"
		? resolve(root, ".release/toolkit", revision, "bin/release-ci.ts")
		: resolve(root, ".release/toolkit", revision, "bin/release.ts");
const forwarded =
	command === "ci"
		? args.includes("--repo")
			? args
			: [...args, "--repo", root]
		: [command ?? "", ...args];
const result = Bun.spawnSync(["bun", entry, ...forwarded], {
	cwd: root,
	env: process.env,
	stdout: "inherit",
	stderr: "inherit",
});
process.exit(result.exitCode);
