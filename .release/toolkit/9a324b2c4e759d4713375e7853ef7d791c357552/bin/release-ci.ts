#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve, relative } from "node:path";
import { isGenuineReleaseGate, type ReleaseGateReport } from "../src/release/gate";
import { verifyVendorSnapshot } from "../src/release/vendor";

async function run() {
  const argv = Bun.argv.slice(2);
  if (argv.length !== 4 || argv[0] !== "--env" ||
      !["preview", "production"].includes(argv[1] ?? "") ||
      argv[2] !== "--repo" || !argv[3]) {
    throw new Error("Use release-ci --env preview|production --repo <consumer Git root>.");
  }
  const environment = argv[1] as "preview" | "production";
  const repo = realpathSync(resolve(argv[3]!));
  const gitRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  if (gitRoot !== repo) throw new Error("CI gate needs the exact consumer Git root.");
  const lock = verifyVendorSnapshot(repo);
  const toolkitRoot = realpathSync(resolve(import.meta.dir, ".."));
  if (relative(repo, toolkitRoot) !== lock.snapshotPath) {
    throw new Error("CI gate was not run from the pinned consumer toolkit snapshot.");
  }
  const revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  const adapter = resolve(repo, ".release/release-adapter.ts");
  const loaded = await import(adapter);
  if (typeof loaded.checkRelease !== "function") {
    throw new Error("Consumer release adapter must export checkRelease(context).");
  }
  const report = await loaded.checkRelease({ environment, revision,
    repository: repo, toolkitRevision: lock.toolkitRevision }) as ReleaseGateReport;
  if (!report || !isGenuineReleaseGate(report) ||
      report.environment !== environment || report.revision !== revision) {
    throw new Error("Consumer adapter did not return a matching toolkit-verified CI gate.");
  }
  console.log(JSON.stringify(report));
  if (!report.ready) process.exitCode = 1;
}

try { await run(); }
catch (error) {
  console.error(error instanceof Error ? error.message : "Release CI gate failed.");
  process.exitCode = 2;
}
