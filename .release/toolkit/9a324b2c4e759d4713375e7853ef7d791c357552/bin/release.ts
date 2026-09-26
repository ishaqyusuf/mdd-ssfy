#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readBaselineClaims } from "../src/release/baselines";
import { parseReleaseCommandArgs } from "../src/release/command";
import { collectGitTargetChanges } from "../src/release/git-changes";
import { validateReleaseManifest } from "../src/release/manifest";
import { planRelease, type ReleaseManifest } from "../src/release/plan";

function gitValue(root: string, args: string[]) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    throw new Error("Release commands require an accessible Git repository and HEAD.");
  }
}

function readManifest(path: string): ReleaseManifest {
  try {
    const manifest = JSON.parse(readFileSync(path, "utf8")) as ReleaseManifest;
    validateReleaseManifest(manifest);
    return manifest;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Release manifest")) {
      throw error;
    }
    throw new Error(`Could not load a valid release manifest at ${path}.`);
  }
}

function run() {
  const options = parseReleaseCommandArgs(Bun.argv.slice(2));
  const start = resolve(options.repoDirectory ?? process.cwd());
  const repo = gitValue(start, ["rev-parse", "--show-toplevel"]);
  const revision = gitValue(repo, ["rev-parse", "HEAD"]);
  const manifestPath = resolve(repo, options.manifestPath ?? "release.manifest.json");
  const manifest = readManifest(manifestPath);
  const baselinePath = resolve(repo, options.baselinesPath ?? ".release/baselines.json");
  const claims = readBaselineClaims(
    baselinePath,
    manifest.project,
    options.environment,
    options.baselinesPath !== null,
  );

  const targetChanges = collectGitTargetChanges(
    manifest,
    options.environment,
    revision,
    claims.baselines,
    repo,
    !options.committed,
  );
  const plan = planRelease(manifest, {
    environment: options.environment,
    revision,
    targetChanges,
  });
  const proofStatus =
    options.command === "check"
      ? plan.actions.length > 0
        ? "proof-missing-or-mismatched"
        : "proof-unverified"
      : "advisory";

  const result = {
    command: options.command,
    project: manifest.project,
    environment: options.environment,
    revision,
    mode: options.committed ? "committed" : "working-tree",
    baselineClaims: claims.present ? "unverified" : "missing",
    proofStatus,
    actions: plan.actions,
  };
  if (options.json) {
    console.log(JSON.stringify(result));
  } else {
    console.log(`${manifest.project} ${options.environment} ${options.command} (${result.mode})`);
    console.log(`Baseline claims: ${result.baselineClaims}; proof: ${proofStatus}`);
    if (plan.actions.length === 0) {
      console.log("No source changes detected against the supplied baseline claims.");
    } else {
      for (const action of plan.actions) {
        console.log(
          `- ${action.targetId}: ${action.action} (${action.reasons.join(", ")})`,
        );
      }
    }
  }

  // Baseline claims are not provider proof. A CI check must not pass until
  // Ticket 4 installs provider-verifiable evidence.
  if (options.command === "check") process.exitCode = 1;
}

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Release command failed.");
  process.exitCode = 2;
}
