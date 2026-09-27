import { execFileSync } from "node:child_process";
import type {
  ReleaseEnvironment,
  ReleaseManifest,
  ReleaseTargetChange,
} from "./plan";

const REVISION_PATTERN = /^[0-9a-f]{7,64}$/i;

function gitPaths(
  repositoryRoot: string,
  baseRevision: string,
  revision: string,
  includeWorkingTree: boolean,
): string[] | null {
  if (
    !REVISION_PATTERN.test(baseRevision) ||
    !REVISION_PATTERN.test(revision)
  ) {
    return null;
  }

  try {
    if (!includeWorkingTree) {
      execFileSync(
        "git",
        ["merge-base", "--is-ancestor", baseRevision, revision],
        { cwd: repositoryRoot, stdio: ["ignore", "ignore", "ignore"] },
      );
    }
    const args = [
      "diff",
      "--no-renames",
      "--name-only",
      "--diff-filter=ACDMRTUXB",
      "-z",
      baseRevision,
      ...(includeWorkingTree ? [] : [revision]),
      "--",
    ];
    const changed = execFileSync("git", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const untracked = includeWorkingTree
      ? execFileSync(
          "git",
          ["ls-files", "--others", "--exclude-standard", "-z"],
          {
            cwd: repositoryRoot,
            encoding: "utf8",
            maxBuffer: 8 * 1024 * 1024,
            stdio: ["ignore", "pipe", "ignore"],
          },
        )
      : "";
    return [...new Set([...changed.split("\0"), ...untracked.split("\0")])]
      .filter(Boolean)
      .sort();
  } catch {
    // A missing or pruned baseline cannot prove there were no changes.
    return null;
  }
}

/**
 * Local Git adapter for the pure planner. Each target/environment has its own
 * last verified baseline; unresolved diffs remain unknown, never empty.
 */
export function collectGitTargetChanges(
  manifest: ReleaseManifest,
  environment: ReleaseEnvironment,
  revision: string,
  baselines: Record<string, string | null>,
  repositoryRoot: string,
  includeWorkingTree = false,
): Record<string, ReleaseTargetChange> {
  const diffCache = new Map<string, string[] | null>();
  const changes: Record<string, ReleaseTargetChange> = {};

  for (const target of manifest.targets) {
    if (!target.environments.includes(environment)) continue;
    const baseRevision = baselines[target.id] ?? null;
    if (!baseRevision) {
      changes[target.id] = {
        baseRevision: null,
        changedPaths: null,
      };
      continue;
    }

    if (!diffCache.has(baseRevision)) {
      diffCache.set(
        baseRevision,
        gitPaths(repositoryRoot, baseRevision, revision, includeWorkingTree),
      );
    }
    changes[target.id] = {
      baseRevision,
      changedPaths: diffCache.get(baseRevision) ?? null,
    };
  }

  return changes;
}
