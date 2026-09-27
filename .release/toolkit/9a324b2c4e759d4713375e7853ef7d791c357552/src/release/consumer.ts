import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { verifyReleaseEvidence, type ProviderEvidenceLookup,
  type ReleaseFingerprint, type VerifiedReleaseEvidence } from "./evidence";
import type { ExpoMobileDecision } from "./expo";
import { runReleaseGate, type ReleaseGateReport } from "./gate";
import { collectGitTargetChanges } from "./git-changes";
import type { JobsDecision } from "./jobs";
import { verifyLiveReleaseState, type ProviderLiveStateLookup } from "./live-state";
import { validateReleaseManifest } from "./manifest";
import { planRelease, type ReleaseEnvironment, type ReleaseManifest,
  type ReleasePlan } from "./plan";
import type { VercelWebVerification } from "./vercel";

export type ConsumerReleaseContext = {
  environment: ReleaseEnvironment;
  revision: string;
  repository: string;
  toolkitRevision: string;
};

export type ConsumerProviderBindings = {
  /** Discover claims from protected workflow/provider output, never local baselines. */
  receiptClaims: (context: ConsumerReleaseContext,
    manifest: ReleaseManifest) => Promise<unknown[]>;
  /** Authenticated provider lookup must corroborate every release receipt field. */
  lookupEvidence: ProviderEvidenceLookup;
  /** Fetch the *currently active* target, not only immutable deployment history. */
  lookupLiveState: ProviderLiveStateLookup;
  /** Fingerprints must represent committed source/config for the requested SHA. */
  currentFingerprints: (context: ConsumerReleaseContext,
    manifest: ReleaseManifest) => Promise<Record<string, ReleaseFingerprint | undefined>>;
  /** Verify required provider actions using toolkit Vercel/Expo/Jobs modules. */
  verifyActions: (context: ConsumerReleaseContext,
    manifest: ReleaseManifest, plan: ReleasePlan,
    evidence: VerifiedReleaseEvidence) => Promise<{
      web?: VercelWebVerification[];
      mobile?: ExpoMobileDecision[];
      jobs?: JobsDecision[];
    }>;
};

/** Shared protected-CI flow: provider baselines → committed Git diff → action proof. */
export async function runConsumerReleaseCheck(
  context: ConsumerReleaseContext,
  bindings: ConsumerProviderBindings,
): Promise<ReleaseGateReport> {
  if (!context || !["preview", "production"].includes(context.environment) ||
      !/^[0-9a-f]{40}$/i.test(context.revision ?? "") ||
      !bindings || typeof bindings.receiptClaims !== "function" ||
      typeof bindings.lookupEvidence !== "function" ||
      typeof bindings.lookupLiveState !== "function" ||
      typeof bindings.currentFingerprints !== "function" ||
      typeof bindings.verifyActions !== "function") {
    throw new Error("Consumer CI check needs full revision and trusted provider bindings.");
  }
  const root = resolve(context.repository);
  let manifest: ReleaseManifest;
  try {
    manifest = JSON.parse(readFileSync(resolve(root, "release.manifest.json"), "utf8"));
    validateReleaseManifest(manifest);
  } catch {
    throw new Error("Consumer CI needs a valid root release.manifest.json.");
  }
  const claims = await bindings.receiptClaims(context, manifest);
  const evidence = await verifyReleaseEvidence(manifest, context.environment,
    claims, bindings.lookupEvidence);
  const liveState = await verifyLiveReleaseState(manifest, evidence,
    bindings.lookupLiveState);
  const changes = collectGitTargetChanges(manifest, context.environment,
    context.revision, evidence.baselines, root, false);
  const plan = planRelease(manifest, { environment: context.environment,
    revision: context.revision, targetChanges: changes });
  const currentFingerprints = await bindings.currentFingerprints(context, manifest);
  const decisions = await bindings.verifyActions(context, manifest, plan, evidence);
  return runReleaseGate({ manifest, plan, evidence, liveState,
    currentFingerprints, ...decisions });
}
