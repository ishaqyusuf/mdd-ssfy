import { latestVerifiedReceiptForTarget, type ReleaseFingerprint,
  type VerifiedReleaseEvidence } from "./evidence";
import { isVerifiedExpoDecision, type ExpoMobileDecision } from "./expo";
import { isVerifiedJobsDecision, type JobsDecision } from "./jobs";
import { liveTargetState, type VerifiedLiveReleaseState } from "./live-state";
import { validateReleaseManifest } from "./manifest";
import type { ReleaseManifest, ReleasePlan, ReleaseTargetKind } from "./plan";
import { isVerifiedVercelWebResult, type VercelWebVerification } from "./vercel";

export type ReleaseGateTarget = {
  targetId: string;
  targetKind: ReleaseTargetKind;
  action: string | null;
  ready: boolean;
  reason:
    | "verified"
    | "waived"
    | "adapter-missing-or-unverified"
    | "provider-action-unready"
    | "receipt-missing"
    | "fingerprint-mismatch"
    | "action-receipt-mismatch"
    | "deployment-id-mismatch"
    | "live-state-missing-or-unverified"
    | "live-state-unready"
    | "prerequisite-unready";
};

export type ReleaseGateReport = {
  project: string;
  environment: "preview" | "production";
  revision: string;
  ready: boolean;
  targets: ReleaseGateTarget[];
};

export type RunReleaseGateInput = {
  manifest: ReleaseManifest;
  plan: ReleasePlan;
  evidence: VerifiedReleaseEvidence;
  liveState?: VerifiedLiveReleaseState;
  currentFingerprints: Record<string, ReleaseFingerprint | undefined>;
  web?: VercelWebVerification[];
  mobile?: ExpoMobileDecision[];
  jobs?: JobsDecision[];
};

const REPORTS = new WeakSet<object>();
const REVISION = /^[0-9a-f]{40}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const FINGERPRINT_KIND: Record<ReleaseTargetKind, ReleaseFingerprint["kind"]> = {
  database: "schema", web: "configuration", mobile: "native",
  jobs: "configuration",
};

export function isGenuineReleaseGate(report: ReleaseGateReport) {
  return REPORTS.has(report);
}

function result(targetId: string, targetKind: ReleaseTargetKind,
  action: string | null, reason: ReleaseGateTarget["reason"]): ReleaseGateTarget {
  return { targetId, targetKind, action, reason,
    ready: reason === "verified" || reason === "waived" };
}

/** Compose independently verified provider decisions and corroborated receipts. */
export function runReleaseGate(input: RunReleaseGateInput): ReleaseGateReport {
  validateReleaseManifest(input.manifest);
  const { manifest, plan, evidence } = input;
  if (!plan || plan.project !== manifest.project ||
      !["preview", "production"].includes(plan.environment) ||
      !REVISION.test(plan.revision ?? "") ||
      !Array.isArray(plan.actions) || !evidence ||
      evidence.project !== manifest.project ||
      evidence.environment !== plan.environment ||
      !input.currentFingerprints || typeof input.currentFingerprints !== "object") {
    throw new Error("CI gate needs matching manifest, full Git SHA, and verified evidence.");
  }
  const active = manifest.targets.filter((target) =>
    target.environments.includes(plan.environment));
  const actions = new Map(plan.actions.map((action) => [action.targetId, action]));
  if (actions.size !== plan.actions.length || plan.actions.some((action) =>
      !active.some((target) => target.id === action.targetId &&
        target.kind === action.targetKind))) {
    throw new Error("CI gate plan contains duplicate or inactive target actions.");
  }
  // The branded evidence lookup rejects a handwritten VerifiedReleaseEvidence.
  for (const target of active) latestVerifiedReceiptForTarget(evidence, target.id);
  const targets: ReleaseGateTarget[] = [];
  for (const target of active) {
    const planned = actions.get(target.id);
    let effectiveAction = planned?.action ?? null;
    const web = input.web?.find((item) => item.targetId === target.id);
    const mobile = input.mobile?.find((item) => item.targetId === target.id);
    const jobs = input.jobs?.find((item) => item.targetId === target.id);
    if (target.kind === "web" && planned) {
      if (!input.web || !isVerifiedVercelWebResult(input.web, plan) ||
          !web || web.environment !== plan.environment) {
        targets.push(result(target.id, target.kind, effectiveAction,
          "adapter-missing-or-unverified"));
        continue;
      }
      if (!web.ready || web.reason !== "ready") {
        targets.push(result(target.id, target.kind, effectiveAction,
          "provider-action-unready"));
        continue;
      }
    }
    if (target.kind === "mobile" && planned) {
      if (!mobile || !isVerifiedExpoDecision(mobile) ||
          mobile.project !== manifest.project || mobile.targetId !== target.id ||
          mobile.environment !== plan.environment ||
          mobile.revision !== plan.revision) {
        targets.push(result(target.id, target.kind, effectiveAction,
          "adapter-missing-or-unverified"));
        continue;
      }
      effectiveAction = mobile.action;
      if (!mobile.ready) {
        targets.push(result(target.id, target.kind, effectiveAction,
          "provider-action-unready"));
        continue;
      }
    }
    if (target.kind === "jobs") {
      if (!input.jobs || !isVerifiedJobsDecision(input.jobs, plan) ||
          !jobs || jobs.project !== manifest.project ||
          jobs.environment !== plan.environment || jobs.revision !== plan.revision) {
        targets.push(result(target.id, target.kind, effectiveAction,
          "adapter-missing-or-unverified"));
        continue;
      }
      if (jobs.reason === "waived" && jobs.ready && !jobs.deploymentId) {
        targets.push(result(target.id, target.kind, effectiveAction, "waived"));
        continue;
      }
      if (planned && (!jobs.ready || jobs.reason !== "deployed") ||
          !planned && !jobs.ready) {
        targets.push(result(target.id, target.kind, effectiveAction,
          "provider-action-unready"));
        continue;
      }
    }
    const receipt = latestVerifiedReceiptForTarget(evidence, target.id);
    if (!receipt) {
      targets.push(result(target.id, target.kind, effectiveAction,
        "receipt-missing"));
      continue;
    }
    const fingerprint = input.currentFingerprints[target.id];
    if (!fingerprint || fingerprint.kind !== FINGERPRINT_KIND[target.kind] ||
        !SHA256.test(fingerprint.value) ||
        fingerprint.kind !== receipt.fingerprint.kind ||
        fingerprint.value !== receipt.fingerprint.value) {
      targets.push(result(target.id, target.kind, effectiveAction,
        "fingerprint-mismatch"));
      continue;
    }
    if (planned && (receipt.revision !== plan.revision ||
        receipt.action !== effectiveAction)) {
      targets.push(result(target.id, target.kind, effectiveAction,
        "action-receipt-mismatch"));
      continue;
    }
    let live = null;
    try {
      live = input.liveState ? liveTargetState(input.liveState,
        evidence, target.id) : null;
    } catch { live = null; }
    if (!live) {
      targets.push(result(target.id, target.kind, effectiveAction,
        "live-state-missing-or-unverified"));
      continue;
    }
    if (!live.ready) {
      targets.push(result(target.id, target.kind, effectiveAction,
        "live-state-unready"));
      continue;
    }
    if (target.kind === "web" && planned &&
        receipt.deploymentId !== web?.deploymentId ||
        target.kind === "jobs" && planned &&
          receipt.deploymentId !== jobs?.deploymentId) {
      targets.push(result(target.id, target.kind, effectiveAction,
        "deployment-id-mismatch"));
      continue;
    }
    targets.push(result(target.id, target.kind, effectiveAction, "verified"));
  }
  const byId = new Map(targets.map((item) => [item.targetId, item]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of targets) {
      if (!item.ready || !actions.has(item.targetId)) continue;
      const target = active.find((candidate) => candidate.id === item.targetId)!;
      if ((target.prerequisites ?? []).some((id) => byId.get(id)?.ready === false)) {
        item.reason = "prerequisite-unready";
        item.ready = false;
        changed = true;
      }
    }
  }
  const report = Object.freeze({
    project: manifest.project, environment: plan.environment,
    revision: plan.revision, ready: targets.every((item) => item.ready),
    targets: Object.freeze(targets.map((item) => Object.freeze(item))),
  }) as ReleaseGateReport;
  REPORTS.add(report);
  return report;
}
