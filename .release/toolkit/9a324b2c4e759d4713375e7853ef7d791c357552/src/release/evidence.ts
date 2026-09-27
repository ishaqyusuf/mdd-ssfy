import { validateReleaseManifest } from "./manifest";
import type {
  ReleaseActionKind,
  ReleaseEnvironment,
  ReleaseManifest,
  ReleasePlan,
  ReleaseTargetKind,
} from "./plan";

export type ReleaseFingerprintKind = "schema" | "native" | "configuration";
export type ReleaseFingerprint = {
  kind: ReleaseFingerprintKind;
  value: string;
};

/** This is a claim, never proof by itself. Provider metadata must corroborate it. */
export type ReleaseReceipt = {
  version: 1;
  project: string;
  targetId: string;
  targetKind: ReleaseTargetKind;
  environment: ReleaseEnvironment;
  revision: string;
  action: ReleaseActionKind;
  fingerprint: ReleaseFingerprint;
  provider: string;
  deploymentId: string;
  result: "succeeded";
  completedAt: string;
};

export type ProviderReleaseMetadata = Omit<ReleaseReceipt, "version" | "result"> & {
  result: "succeeded" | "failed" | "pending";
};

/**
 * Implement this in trusted toolkit/provider code, not a consumer manifest or
 * handwritten file. It must fetch metadata by provider and deployment identity.
 */
export type ProviderEvidenceLookup = (
  provider: string,
  deploymentId: string,
) => Promise<ProviderReleaseMetadata | null>;

export type RejectedReceipt = {
  targetId: string | null;
  reason:
    | "invalid-receipt"
    | "wrong-project"
    | "wrong-environment"
    | "inactive-target"
    | "provider-unavailable"
    | "provider-not-found"
    | "provider-mismatch";
};

export type VerifiedReleaseEvidence = {
  project: string;
  environment: ReleaseEnvironment;
  verified: ReleaseReceipt[];
  rejected: RejectedReceipt[];
  baselines: Record<string, string | null>;
};

export type ReleaseReadiness = {
  ready: boolean;
  missingTargets: string[];
  mismatchedTargets: string[];
};

const REVISION = /^[0-9a-f]{7,64}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const ACTIONS: Record<ReleaseTargetKind, ReleaseActionKind[]> = {
  database: ["db-push"],
  web: ["web-deploy"],
  mobile: ["mobile-build", "mobile-update"],
  jobs: ["jobs-deploy"],
};
const FINGERPRINTS: Record<ReleaseTargetKind, ReleaseFingerprintKind> = {
  database: "schema",
  web: "configuration",
  mobile: "native",
  jobs: "configuration",
};
const VERIFIED_RESULTS = new WeakSet<object>();

function isFingerprint(
  value: unknown,
  targetKind: ReleaseTargetKind,
): value is ReleaseFingerprint {
  if (!value || typeof value !== "object") return false;
  const fingerprint = value as Partial<ReleaseFingerprint>;
  return fingerprint.kind === FINGERPRINTS[targetKind] &&
    typeof fingerprint.value === "string" && SHA256.test(fingerprint.value);
}

function isReceipt(value: unknown): value is ReleaseReceipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<ReleaseReceipt>;
  if (!receipt.targetKind || !Object.hasOwn(ACTIONS, receipt.targetKind)) return false;
  return receipt.version === 1 &&
    typeof receipt.project === "string" && ID.test(receipt.project) &&
    typeof receipt.targetId === "string" && ID.test(receipt.targetId) &&
    ["preview", "production"].includes(receipt.environment ?? "") &&
    typeof receipt.revision === "string" && REVISION.test(receipt.revision) &&
    Boolean(receipt.action && ACTIONS[receipt.targetKind].includes(receipt.action)) &&
    isFingerprint(receipt.fingerprint, receipt.targetKind) &&
    typeof receipt.provider === "string" && ID.test(receipt.provider) &&
    typeof receipt.deploymentId === "string" && ID.test(receipt.deploymentId) &&
    receipt.result === "succeeded" &&
    typeof receipt.completedAt === "string" &&
    !Number.isNaN(Date.parse(receipt.completedAt)) &&
    new Date(receipt.completedAt).toISOString() === receipt.completedAt;
}

function canonicalReceipt(receipt: ReleaseReceipt): ReleaseReceipt {
  return Object.freeze({
    version: 1 as const,
    project: receipt.project,
    targetId: receipt.targetId,
    targetKind: receipt.targetKind,
    environment: receipt.environment,
    revision: receipt.revision,
    action: receipt.action,
    fingerprint: Object.freeze({
      kind: receipt.fingerprint.kind,
      value: receipt.fingerprint.value,
    }),
    provider: receipt.provider,
    deploymentId: receipt.deploymentId,
    result: "succeeded" as const,
    completedAt: receipt.completedAt,
  });
}

function matchesProvider(
  receipt: ReleaseReceipt,
  metadata: ProviderReleaseMetadata,
) {
  return metadata.project === receipt.project &&
    metadata.targetId === receipt.targetId &&
    metadata.targetKind === receipt.targetKind &&
    metadata.environment === receipt.environment &&
    metadata.revision === receipt.revision &&
    metadata.action === receipt.action &&
    metadata.fingerprint?.kind === receipt.fingerprint.kind &&
    metadata.fingerprint?.value === receipt.fingerprint.value &&
    metadata.provider === receipt.provider &&
    metadata.deploymentId === receipt.deploymentId &&
    metadata.result === receipt.result &&
    metadata.completedAt === receipt.completedAt;
}

function newestByTarget(receipts: ReleaseReceipt[]) {
  const latest = new Map<string, ReleaseReceipt>();
  for (const receipt of receipts) {
    const previous = latest.get(receipt.targetId);
    if (!previous || receipt.completedAt > previous.completedAt ||
        (receipt.completedAt === previous.completedAt &&
          receipt.deploymentId > previous.deploymentId)) {
      latest.set(receipt.targetId, receipt);
    }
  }
  return latest;
}

export async function verifyReleaseEvidence(
  manifest: ReleaseManifest,
  environment: ReleaseEnvironment,
  claims: unknown[],
  lookup: ProviderEvidenceLookup,
): Promise<VerifiedReleaseEvidence> {
  validateReleaseManifest(manifest);
  if (!["preview", "production"].includes(environment) ||
      !Array.isArray(claims) || typeof lookup !== "function") {
    throw new Error("Release evidence needs environment, claims, and trusted lookup.");
  }
  const activeTargets = new Map(manifest.targets
    .filter((target) => target.environments.includes(environment))
    .map((target) => [target.id, target]));
  const verified: ReleaseReceipt[] = [];
  const rejected: RejectedReceipt[] = [];

  for (const claim of claims) {
    const targetId = typeof claim === "object" && claim &&
      typeof (claim as { targetId?: unknown }).targetId === "string"
      ? (claim as { targetId: string }).targetId : null;
    let reason: RejectedReceipt["reason"] | null = null;
    if (!isReceipt(claim)) reason = "invalid-receipt";
    else if (claim.project !== manifest.project) reason = "wrong-project";
    else if (claim.environment !== environment) reason = "wrong-environment";
    else if (activeTargets.get(claim.targetId)?.kind !== claim.targetKind) {
      reason = "inactive-target";
    } else {
      let metadata: ProviderReleaseMetadata | null;
      try {
        metadata = await lookup(claim.provider, claim.deploymentId);
      } catch {
        reason = "provider-unavailable";
        metadata = null;
      }
      if (!reason) {
        if (!metadata) reason = "provider-not-found";
        else if (!matchesProvider(claim, metadata)) reason = "provider-mismatch";
      }
    }
    if (reason) rejected.push({ targetId, reason });
    else verified.push(canonicalReceipt(claim as ReleaseReceipt));
  }

  const latest = newestByTarget(verified);
  const baselines: Record<string, string | null> = {};
  for (const id of activeTargets.keys()) {
    baselines[id] = latest.get(id)?.revision ?? null;
  }
  const result = Object.freeze({
    project: manifest.project,
    environment,
    verified: Object.freeze(verified),
    rejected: Object.freeze(rejected),
    baselines: Object.freeze(baselines),
  }) as VerifiedReleaseEvidence;
  VERIFIED_RESULTS.add(result);
  return result;
}

/**
 * A plan may have no source actions yet still be unready: every active target
 * needs matching verified provider state and a current fingerprint.
 */
export function assessReleaseReadiness(
  manifest: ReleaseManifest,
  plan: ReleasePlan,
  evidence: VerifiedReleaseEvidence,
  currentFingerprints: Record<string, ReleaseFingerprint | undefined>,
): ReleaseReadiness {
  validateReleaseManifest(manifest);
  if (!VERIFIED_RESULTS.has(evidence) ||
      plan.project !== manifest.project || evidence.project !== manifest.project ||
      plan.environment !== evidence.environment ||
      !["preview", "production"].includes(plan.environment) ||
      typeof plan.revision !== "string" || !REVISION.test(plan.revision) ||
      !Array.isArray(plan.actions) ||
      !currentFingerprints || typeof currentFingerprints !== "object") {
    throw new Error("Release readiness inputs do not share project and environment.");
  }
  const actionByTarget = new Map(plan.actions.map((action) => [action.targetId, action]));
  const latest = newestByTarget(evidence.verified);
  const missingTargets: string[] = [];
  const mismatchedTargets: string[] = [];
  for (const target of manifest.targets) {
    if (!target.environments.includes(plan.environment)) continue;
    const receipt = latest.get(target.id);
    if (!receipt) {
      missingTargets.push(target.id);
      continue;
    }
    const current = currentFingerprints[target.id];
    const required = actionByTarget.get(target.id);
    if (!isFingerprint(current, target.kind) ||
        receipt.fingerprint.kind !== current.kind ||
        receipt.fingerprint.value !== current.value ||
        (required && (receipt.revision !== plan.revision ||
          receipt.action !== required.action))) {
      mismatchedTargets.push(target.id);
    }
  }
  return {
    ready: missingTargets.length === 0 && mismatchedTargets.length === 0,
    missingTargets,
    mismatchedTargets,
  };
}

/** Exposes only corroborated provider state from an in-process verifier result. */
export function latestVerifiedReceiptForTarget(
  evidence: VerifiedReleaseEvidence,
  targetId: string,
): ReleaseReceipt | null {
  if (!VERIFIED_RESULTS.has(evidence)) {
    throw new Error("Target receipt lookup needs verified provider evidence.");
  }
  return newestByTarget(evidence.verified).get(targetId) ?? null;
}
