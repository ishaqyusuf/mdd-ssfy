import { orderByPrerequisites } from "./graph";
import {
  assertRelativeChangedPath,
  matchesAny,
  validateReleaseManifest,
} from "./manifest";

export type ReleaseEnvironment = "preview" | "production";
export type ReleaseTargetKind = "database" | "web" | "mobile" | "jobs";
export type ReleaseActionKind =
  | "db-push"
  | "web-deploy"
  | "mobile-build"
  | "mobile-update"
  | "jobs-deploy";

export type ReleaseTarget = {
  id: string;
  kind: ReleaseTargetKind;
  environments: ReleaseEnvironment[];
  sourcePaths: string[];
  nativeCandidatePaths?: string[];
  impactTargets?: string[];
  prerequisites?: string[];
};

export type ReleaseManifest = {
  version: 1;
  project: string;
  targets: ReleaseTarget[];
};

export type NativeFingerprint = {
  base: string | null;
  current: string | null;
};

export type ReleaseTargetChange = {
  baseRevision: string | null;
  changedPaths: string[] | null;
  nativeFingerprint?: NativeFingerprint;
};

export type ReleasePlanInput = {
  environment: ReleaseEnvironment;
  revision: string;
  targetChanges: Record<string, ReleaseTargetChange>;
};

export type ReleaseAction = {
  targetId: string;
  targetKind: ReleaseTargetKind;
  action: ReleaseActionKind;
  changedPaths: string[];
  reasons: string[];
  prerequisites: string[];
};

export type ReleasePlan = {
  project: string;
  environment: ReleaseEnvironment;
  revision: string;
  actions: ReleaseAction[];
};

const REVISION_PATTERN = /^[0-9a-f]{7,64}$/i;

function hasKnownBaseline(change: ReleaseTargetChange | undefined) {
  return typeof change?.baseRevision === "string" &&
    REVISION_PATTERN.test(change.baseRevision);
}

function actionForKind(kind: ReleaseTargetKind): ReleaseActionKind {
  switch (kind) {
    case "database":
      return "db-push";
    case "web":
      return "web-deploy";
    case "mobile":
      return "mobile-update";
    case "jobs":
      return "jobs-deploy";
  }
}

/**
 * Pure release-planning interface. Git diff collection and provider proof are
 * adapters outside this module; missing change evidence is conservative.
 */
export function planRelease(
  manifest: ReleaseManifest,
  input: ReleasePlanInput,
): ReleasePlan {
  validateReleaseManifest(manifest);
  if (
    !input ||
    !["preview", "production"].includes(input.environment) ||
    typeof input.revision !== "string" ||
    !REVISION_PATTERN.test(input.revision) ||
    !input.targetChanges ||
    typeof input.targetChanges !== "object" ||
    Array.isArray(input.targetChanges)
  ) {
    throw new Error("Release plan needs valid environment, revision, and target changes.");
  }

  const activeTargets = manifest.targets.filter((target) =>
    target.environments.includes(input.environment),
  );
  const byId = new Map(activeTargets.map((target) => [target.id, target]));
  const affected = new Set<string>();
  const directPaths = new Map<string, string[]>();
  const reasons = new Map<string, string[]>();

  for (const target of activeTargets) {
    const change = input.targetChanges[target.id];
    const paths = change?.changedPaths;
    if (paths !== undefined && paths !== null && !Array.isArray(paths)) {
      throw new Error(`Invalid changed paths for ${target.id}`);
    }
    for (const path of paths ?? []) assertRelativeChangedPath(path);
    const matched = (paths ?? []).filter(
      (path) =>
        matchesAny(path, target.sourcePaths) ||
        matchesAny(path, target.nativeCandidatePaths ?? []),
    );
    directPaths.set(target.id, [...new Set(matched)].sort());

    const targetReasons: string[] = [];
    if (!hasKnownBaseline(change)) {
      targetReasons.push("baseline-missing");
    } else if (paths === null) {
      targetReasons.push("change-unknown");
    } else if (matched.length > 0) {
      targetReasons.push("source-changed");
    }

    if (target.kind === "mobile" && change?.nativeFingerprint) {
      const { base, current } = change.nativeFingerprint;
      if (base && current && base !== current) {
        targetReasons.push("native-changed");
      }
    }
    if (targetReasons.length > 0) affected.add(target.id);
    reasons.set(target.id, targetReasons);
  }

  const queue = [...affected];
  for (let i = 0; i < queue.length; i += 1) {
    const source = byId.get(queue[i]);
    for (const downstreamId of source?.impactTargets ?? []) {
      if (!byId.has(downstreamId) || affected.has(downstreamId)) continue;
      affected.add(downstreamId);
      reasons.get(downstreamId)?.push(`dependency-changed:${source?.id}`);
      queue.push(downstreamId);
    }
  }

  const actions: ReleaseAction[] = [];
  for (const target of activeTargets) {
    if (!affected.has(target.id)) continue;
    const change = input.targetChanges[target.id];
    const changedPaths = directPaths.get(target.id) ?? [];
    const targetReasons = reasons.get(target.id) ?? [];
    let action = actionForKind(target.kind);

    if (target.kind === "mobile") {
      const nativeCandidates = changedPaths.filter((path) =>
        matchesAny(path, target.nativeCandidatePaths ?? []),
      );
      const fingerprint = change?.nativeFingerprint;
      const fingerprintKnown = Boolean(fingerprint?.base && fingerprint.current);
      const mustBuild =
        !hasKnownBaseline(change) ||
        change.changedPaths === null ||
        !fingerprintKnown ||
        fingerprint?.base !== fingerprint?.current ||
        nativeCandidates.length > 0;

      if (mustBuild) {
        action = "mobile-build";
        if (nativeCandidates.length > 0) {
          targetReasons.push("native-candidate-changed");
        }
        if (!fingerprintKnown) {
          targetReasons.push("native-unknown");
        }
      }
    }

    actions.push({
      targetId: target.id,
      targetKind: target.kind,
      action,
      changedPaths,
      reasons: targetReasons,
      prerequisites: (target.prerequisites ?? []).filter((id) => byId.has(id)),
    });
  }

  const actionById = new Map(actions.map((action) => [action.targetId, action]));
  const orderedIds = orderByPrerequisites(
    actions.map((action) => action.targetId),
    (id) => byId.get(id)?.prerequisites ?? [],
  );
  return {
    project: manifest.project,
    environment: input.environment,
    revision: input.revision,
    actions: orderedIds.map((id) => actionById.get(id)!),
  };
}
