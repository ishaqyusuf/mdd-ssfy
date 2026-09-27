import { latestVerifiedReceiptForTarget, type ReleaseReceipt,
  type VerifiedReleaseEvidence } from "./evidence";
import { validateReleaseManifest } from "./manifest";
import type { ReleaseEnvironment, ReleaseManifest,
  ReleaseTargetKind } from "./plan";

/** Normalized authenticated observation of the currently active hosted target. */
export type ProviderLiveStateMetadata = {
  project: string;
  targetId: string;
  targetKind: ReleaseTargetKind;
  environment: ReleaseEnvironment;
  revision: string;
  provider: string;
  deploymentId: string;
  fingerprint: ReleaseReceipt["fingerprint"];
  active: boolean;
  observedAt: string;
};

/** Must query live alias, worker, channel/store, or DB state—not only an ID record. */
export type ProviderLiveStateLookup = (
  verifiedReceipt: ReleaseReceipt,
) => Promise<ProviderLiveStateMetadata | null>;

export type LiveTargetState = {
  targetId: string;
  ready: boolean;
  reason:
    | "current"
    | "receipt-missing"
    | "provider-unavailable"
    | "state-missing"
    | "state-mismatch"
    | "inactive"
    | "observation-stale";
};

export type VerifiedLiveReleaseState = {
  project: string;
  environment: ReleaseEnvironment;
  targets: LiveTargetState[];
};

const RESULTS = new WeakMap<object, VerifiedReleaseEvidence>();
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

function exactObservationTime(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString() === value ? parsed : null;
}

function matchesReceipt(metadata: ProviderLiveStateMetadata,
  receipt: ReleaseReceipt) {
  return metadata.project === receipt.project &&
    metadata.targetId === receipt.targetId &&
    metadata.targetKind === receipt.targetKind &&
    metadata.environment === receipt.environment &&
    metadata.revision === receipt.revision &&
    metadata.provider === receipt.provider &&
    metadata.deploymentId === receipt.deploymentId &&
    metadata.fingerprint?.kind === receipt.fingerprint.kind &&
    metadata.fingerprint?.value === receipt.fingerprint.value;
}

function targetState(targetId: string, reason: LiveTargetState["reason"]):
LiveTargetState {
  return Object.freeze({ targetId, reason, ready: reason === "current" });
}

/** Corroborate each receipt against fresh *current* provider state, separately. */
export async function verifyLiveReleaseState(
  manifest: ReleaseManifest,
  evidence: VerifiedReleaseEvidence,
  lookup: ProviderLiveStateLookup,
  now?: Date,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
): Promise<VerifiedLiveReleaseState> {
  validateReleaseManifest(manifest);
  if (!evidence || evidence.project !== manifest.project ||
      !["preview", "production"].includes(evidence.environment) ||
      typeof lookup !== "function" ||
      now !== undefined &&
        (!(now instanceof Date) || !Number.isFinite(now.getTime())) ||
      !Number.isSafeInteger(maxAgeMs) || maxAgeMs <= 0) {
    throw new Error("Live release proof needs verified receipts and a trusted current-state lookup.");
  }
  const active = manifest.targets.filter((target) =>
    target.environments.includes(evidence.environment));
  const targets: LiveTargetState[] = [];
  for (const target of active) {
    // Reject a handwritten evidence result before any provider call.
    const receipt = latestVerifiedReceiptForTarget(evidence, target.id);
    if (!receipt) {
      targets.push(targetState(target.id, "receipt-missing"));
      continue;
    }
    let metadata: ProviderLiveStateMetadata | null;
    try { metadata = await lookup(receipt); }
    catch {
      targets.push(targetState(target.id, "provider-unavailable"));
      continue;
    }
    if (!metadata) {
      targets.push(targetState(target.id, "state-missing"));
      continue;
    }
    if (!matchesReceipt(metadata, receipt)) {
      targets.push(targetState(target.id, "state-mismatch"));
      continue;
    }
    const observedAt = exactObservationTime(metadata.observedAt);
    // The default reference clock must be captured after the async observation.
    const referenceTime = (now ?? new Date()).getTime();
    if (observedAt === null || observedAt > referenceTime ||
        referenceTime - observedAt > maxAgeMs) {
      targets.push(targetState(target.id, "observation-stale"));
      continue;
    }
    targets.push(targetState(target.id,
      metadata.active === true ? "current" : "inactive"));
  }
  const result = Object.freeze({ project: manifest.project,
    environment: evidence.environment,
    targets: Object.freeze(targets) }) as VerifiedLiveReleaseState;
  RESULTS.set(result, evidence);
  return result;
}

export function liveTargetState(
  evidence: VerifiedLiveReleaseState,
  releaseEvidence: VerifiedReleaseEvidence,
  targetId: string,
): LiveTargetState | null {
  if (RESULTS.get(evidence) !== releaseEvidence ||
      evidence.project !== releaseEvidence.project ||
      evidence.environment !== releaseEvidence.environment) {
    throw new Error("Live target lookup needs matching provider-verified state.");
  }
  return evidence.targets.find((item) => item.targetId === targetId) ?? null;
}
