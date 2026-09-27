import { Glob } from "bun";
import { orderByPrerequisites } from "./graph";
import type {
  ReleaseManifest,
  ReleaseTarget,
  ReleaseTargetKind,
  ReleaseEnvironment,
} from "./plan";

const TARGET_KINDS = new Set<ReleaseTargetKind>([
  "database",
  "web",
  "mobile",
  "jobs",
]);
const ENVIRONMENTS = new Set<ReleaseEnvironment>(["preview", "production"]);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function assertRelativePattern(pattern: string, label: string) {
  if (
    typeof pattern !== "string" ||
    !pattern ||
    pattern.startsWith("/") ||
    pattern.includes("\\") ||
    pattern.split("/").some((segment) => segment === ".." || segment === ".") ||
    pattern.startsWith("!")
  ) {
    throw new Error(`Invalid relative glob in ${label}: ${pattern}`);
  }
  try {
    new Glob(pattern);
  } catch {
    throw new Error(`Invalid relative glob in ${label}: ${pattern}`);
  }
}

export function assertRelativeChangedPath(path: string) {
  if (
    typeof path !== "string" ||
    !path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((segment) => segment === ".." || segment === ".")
  ) {
    throw new Error(`Invalid changed path: ${path}`);
  }
}

export function matchesAny(path: string, patterns: string[]) {
  return patterns.some((pattern) => new Glob(pattern).match(path));
}

export function validateReleaseManifest(manifest: ReleaseManifest) {
  if (!manifest || manifest.version !== 1) {
    throw new Error("Unsupported release manifest version.");
  }
  if (typeof manifest.project !== "string" || !ID_PATTERN.test(manifest.project)) {
    throw new Error("Release manifest project must be a stable identifier.");
  }
  if (!Array.isArray(manifest.targets) || manifest.targets.length === 0) {
    throw new Error("Release manifest needs at least one target.");
  }

  const ids = new Set<string>();
  for (const target of manifest.targets) {
    if (!target || typeof target.id !== "string" ||
        !ID_PATTERN.test(target.id) || ids.has(target.id)) {
      throw new Error(`Duplicate or invalid release target id: ${target?.id}`);
    }
    ids.add(target.id);
    if (!TARGET_KINDS.has(target.kind)) {
      throw new Error(`Unsupported release target kind: ${target.kind}`);
    }
    if (
      !Array.isArray(target.environments) ||
      target.environments.length === 0 ||
      target.environments.some((environment) => !ENVIRONMENTS.has(environment)) ||
      new Set(target.environments).size !== target.environments.length
    ) {
      throw new Error(`Invalid environments for release target: ${target.id}`);
    }
    if (!Array.isArray(target.sourcePaths) || target.sourcePaths.length === 0) {
      throw new Error(`Missing source paths for release target: ${target.id}`);
    }
    for (const pattern of target.sourcePaths) assertRelativePattern(pattern, target.id);
    if (target.nativeCandidatePaths && target.kind !== "mobile") {
      throw new Error(`Only mobile targets may have native candidate paths: ${target.id}`);
    }
    if (target.nativeCandidatePaths && !Array.isArray(target.nativeCandidatePaths)) {
      throw new Error(`Invalid native candidate paths for ${target.id}`);
    }
    for (const pattern of target.nativeCandidatePaths ?? []) {
      assertRelativePattern(pattern, target.id);
    }
    if ((target.impactTargets && !Array.isArray(target.impactTargets)) ||
        (target.prerequisites && !Array.isArray(target.prerequisites))) {
      throw new Error(`Invalid release target links on ${target.id}`);
    }
  }

  const byId = new Map<string, ReleaseTarget>(
    manifest.targets.map((target) => [target.id, target]),
  );
  for (const target of manifest.targets) {
    for (const linkedId of [
      ...(target.impactTargets ?? []),
      ...(target.prerequisites ?? []),
    ]) {
      if (!ids.has(linkedId) || linkedId === target.id) {
        throw new Error(`Invalid linked release target ${linkedId} on ${target.id}`);
      }
    }
    for (const prerequisiteId of target.prerequisites ?? []) {
      const prerequisite = byId.get(prerequisiteId)!;
      if (target.environments.some(
        (environment) => !prerequisite.environments.includes(environment),
      )) {
        throw new Error(
          `Release prerequisite ${prerequisiteId} is unavailable in an environment used by ${target.id}`,
        );
      }
    }
    for (const downstreamId of target.impactTargets ?? []) {
      const downstream = byId.get(downstreamId)!;
      if (!target.environments.some((environment) =>
        downstream.environments.includes(environment))) {
        throw new Error(
          `Release impact target ${downstreamId} shares no environment with ${target.id}`,
        );
      }
    }
  }
  orderByPrerequisites(
    manifest.targets.map((target) => target.id),
    (id) => byId.get(id)?.prerequisites ?? [],
  );
}
