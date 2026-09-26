import { validateReleaseManifest } from "./manifest";
import type { ReleaseEnvironment, ReleaseManifest, ReleasePlan } from "./plan";

export type JobsIsolatedEnvironment = {
  capability: "isolated";
  providerEnvironment: string;
  branch: string | null;
};
export type JobsUnsupportedEnvironment = {
  capability: "unsupported";
  reason: string;
};
export type JobsTargetConfig = {
  targetId: string;
  provider: string;
  projectRef: string;
  preview: JobsIsolatedEnvironment | JobsUnsupportedEnvironment;
  production: JobsIsolatedEnvironment;
};

/** Authenticated provider metadata, normalized by the consumer adapter. */
export type JobsDeploymentRecord = {
  id: string;
  provider: string;
  projectRef: string;
  providerEnvironment: string;
  branch: string | null;
  revision: string;
  configurationFingerprint: string;
  version: string;
  status: "deployed" | "pending" | "failed";
  current: boolean;
};
export type JobsDeploymentLookup = (
  id: string,
  config: JobsTargetConfig,
  environment: ReleaseEnvironment,
) => Promise<JobsDeploymentRecord | null>;

/** Authenticated protected-CI approval; a local waiver claim is never enough. */
export type JobsPreviewWaiverRecord = {
  id: string;
  project: string;
  targetId: string;
  environment: "preview";
  revision: string;
  status: "approved" | "denied" | "pending";
  protectedApproval: boolean;
  approvedBy: string;
  reason: string;
  expiresAt: string;
};
export type JobsWaiverLookup = (id: string) => Promise<JobsPreviewWaiverRecord | null>;

export type JobsDecision = {
  project: string;
  targetId: string;
  environment: ReleaseEnvironment;
  revision: string;
  deploymentId: string | null;
  waiverId: string | null;
  ready: boolean;
  reason:
    | "deployed"
    | "not-required"
    | "waived"
    | "unsupported"
    | "waiver-invalid"
    | "fingerprint-unavailable"
    | "deployment-missing"
    | "deployment-mismatch"
    | "provider-unavailable";
};

export type VerifyJobsInput = {
  manifest: ReleaseManifest;
  plan: ReleasePlan;
  configs: JobsTargetConfig[];
  deploymentIds: Record<string, string | null | undefined>;
  currentConfigurationFingerprints: Record<string, string | null | undefined>;
  lookupDeployment: JobsDeploymentLookup;
  previewWaiverIds?: Record<string, string | null | undefined>;
  lookupWaiver?: JobsWaiverLookup;
  now?: Date;
};

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const REVISION = /^[0-9a-f]{40}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const VERIFIED_DECISIONS = new WeakMap<object, { project: string;
  environment: ReleaseEnvironment; revision: string }>();

export function isVerifiedJobsDecision(results: JobsDecision[], plan: ReleasePlan) {
  const binding = VERIFIED_DECISIONS.get(results);
  return Boolean(binding && binding.project === plan.project &&
    binding.environment === plan.environment && binding.revision === plan.revision);
}

function validId(value: unknown): value is string {
  return typeof value === "string" && ID.test(value);
}

function validateConfig(config: JobsTargetConfig) {
  if (!config || !validId(config.targetId) || !validId(config.provider) ||
      !validId(config.projectRef) || !config.preview || !config.production ||
      config.production.capability !== "isolated" ||
      config.preview.capability === "isolated" &&
        (!validId(config.preview.providerEnvironment) ||
          config.preview.providerEnvironment === "prod" ||
          (config.preview.branch !== null && !validId(config.preview.branch))) ||
      config.preview.capability === "unsupported" &&
        (typeof config.preview.reason !== "string" ||
          config.preview.reason.trim().length === 0) ||
      !["isolated", "unsupported"].includes(config.preview.capability) ||
      !validId(config.production.providerEnvironment) ||
      config.production.providerEnvironment !== "prod" ||
      config.production.branch !== null) {
    throw new Error("Invalid jobs environment mapping; Preview must be isolated from Production.");
  }
}

function decision(input: VerifyJobsInput, targetId: string,
  reason: JobsDecision["reason"], deploymentId: string | null = null,
  waiverId: string | null = null): JobsDecision {
  return {
    project: input.manifest.project,
    targetId, environment: input.plan.environment,
    revision: input.plan.revision, deploymentId, waiverId,
    reason, ready: ["deployed", "not-required", "waived"].includes(reason),
  };
}

function validWaiver(record: JobsPreviewWaiverRecord | null, id: string,
  input: VerifyJobsInput, targetId: string, now: Date) {
  const expiresAt = record ? Date.parse(record.expiresAt) : NaN;
  return Boolean(record && record.id === id && record.project === input.manifest.project &&
    record.targetId === targetId && record.environment === "preview" &&
    record.revision === input.plan.revision && record.status === "approved" &&
    record.protectedApproval === true && validId(record.approvedBy) &&
    typeof record.reason === "string" && record.reason.trim().length > 0 &&
    Number.isFinite(expiresAt) && expiresAt > now.getTime());
}

function validDeployment(record: JobsDeploymentRecord | null,
  id: string, config: JobsTargetConfig,
  environment: JobsIsolatedEnvironment, revision: string,
  fingerprint: string) {
  return Boolean(record && record.id === id && record.provider === config.provider &&
    record.projectRef === config.projectRef &&
    record.providerEnvironment === environment.providerEnvironment &&
    record.branch === environment.branch && record.revision === revision &&
    record.configurationFingerprint === fingerprint &&
    validId(record.version) && record.status === "deployed" &&
    record.current === true);
}

/** Required jobs actions need live, environment-bound provider proof. */
export async function verifyJobsDeployments(input: VerifyJobsInput): Promise<JobsDecision[]> {
  validateReleaseManifest(input.manifest);
  if (!input.plan || input.plan.project !== input.manifest.project ||
      !["preview", "production"].includes(input.plan.environment) ||
      !REVISION.test(input.plan.revision ?? "") ||
      !Array.isArray(input.configs) || !input.deploymentIds ||
      !input.currentConfigurationFingerprints ||
      typeof input.lookupDeployment !== "function" ||
      input.now && (!(input.now instanceof Date) || !Number.isFinite(input.now.getTime()))) {
    throw new Error("Jobs verification needs matching plan, target mappings, and provider lookup.");
  }
  const active = input.manifest.targets.filter((target) =>
    target.kind === "jobs" && target.environments.includes(input.plan.environment));
  const configIds = new Set<string>();
  for (const config of input.configs) {
    validateConfig(config);
    if (configIds.has(config.targetId) ||
        !active.some((target) => target.id === config.targetId)) {
      throw new Error("Jobs configuration must map each active jobs target exactly once.");
    }
    configIds.add(config.targetId);
  }
  if (configIds.size !== active.length) {
    throw new Error("Jobs configuration is missing an active target.");
  }
  const now = input.now ?? new Date();
  const results: JobsDecision[] = [];
  for (const target of active) {
    const config = input.configs.find((item) => item.targetId === target.id)!;
    const environment = config[input.plan.environment];
    if (environment.capability === "unsupported") {
      const id = input.previewWaiverIds?.[target.id];
      if (!validId(id) || typeof input.lookupWaiver !== "function") {
        results.push(decision(input, target.id, "unsupported"));
        continue;
      }
      let waiver: JobsPreviewWaiverRecord | null = null;
      try { waiver = await input.lookupWaiver(id); } catch { waiver = null; }
      results.push(decision(input, target.id,
        validWaiver(waiver, id, input, target.id, now) ? "waived" : "waiver-invalid",
        null, id));
      continue;
    }
    const action = input.plan.actions.find((item) =>
      item.targetId === target.id && item.targetKind === "jobs");
    if (!action) {
      results.push(decision(input, target.id, "not-required"));
      continue;
    }
    if (action.action !== "jobs-deploy") {
      throw new Error("Planned jobs target must require jobs-deploy.");
    }
    const fingerprint = input.currentConfigurationFingerprints[target.id];
    if (typeof fingerprint !== "string" || !SHA256.test(fingerprint)) {
      results.push(decision(input, target.id, "fingerprint-unavailable"));
      continue;
    }
    const id = input.deploymentIds[target.id];
    if (!validId(id)) {
      results.push(decision(input, target.id, "deployment-missing"));
      continue;
    }
    let record: JobsDeploymentRecord | null = null;
    try { record = await input.lookupDeployment(id, config, input.plan.environment); }
    catch {
      results.push(decision(input, target.id, "provider-unavailable", id));
      continue;
    }
    results.push(decision(input, target.id,
      validDeployment(record, id, config, environment,
        input.plan.revision, fingerprint) ? "deployed" : "deployment-mismatch", id));
  }
  const verified = Object.freeze(results.map((item) => Object.freeze(item))) as
    unknown as JobsDecision[];
  VERIFIED_DECISIONS.set(verified, { project: input.plan.project,
    environment: input.plan.environment, revision: input.plan.revision });
  return verified;
}
