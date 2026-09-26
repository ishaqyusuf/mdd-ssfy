import { latestVerifiedReceiptForTarget, type VerifiedReleaseEvidence } from "./evidence";
import type { ReleaseManifest, ReleasePlan } from "./plan";
import { validateReleaseManifest } from "./manifest";

export type VercelWebTarget = {
  targetId: string;
  projectId: string;
  teamId?: string;
  previewProviderTarget?: string;
  commitMetaKey?: string;
  dbGateCheckName?: string;
  previewDomain?: string;
  productionDomain?: string;
};

export type VercelDeploymentMetadata = {
  id: string;
  projectId: string;
  readyState: string;
  target: string | null;
  url: string;
  meta?: Record<string, string>;
  gitSource?: { sha?: string };
  readySubstate?: string | null;
};

export type VercelDomainAssignment = {
  deploymentId: string;
  assignedAt: string;
};

export type VercelPromotionGate = {
  active: boolean;
  mode: "deployment-checks" | "manual-promotion";
  requiredChecks?: string[];
};

/** Implement these through authenticated Vercel APIs, never local claims. */
export type VercelDeploymentLookup = (
  deploymentId: string,
  teamId?: string,
) => Promise<VercelDeploymentMetadata | null>;
export type VercelDomainLookup = (
  domain: string,
  teamId?: string,
) => Promise<VercelDomainAssignment | null>;
export type VercelPromotionGateLookup = (
  projectId: string,
  teamId?: string,
) => Promise<VercelPromotionGate | null>;

export type VercelWebVerification = {
  targetId: string;
  projectId: string;
  environment: "preview" | "production";
  deploymentId: string | null;
  url: string | null;
  ready: boolean;
  reason:
    | "ready"
    | "not-required"
    | "configuration-missing"
    | "deployment-missing"
    | "provider-unavailable"
    | "deployment-mismatch"
    | "domain-unassigned"
    | "domain-mismatch"
    | "promotion-hold-missing"
    | "db-proof-missing"
    | "db-after-promotion"
    | "promotion-time-unverified";
};

export type VerifyVercelWebInput = {
  manifest: ReleaseManifest;
  plan: ReleasePlan;
  configs: VercelWebTarget[];
  deploymentIds: Record<string, string | null | undefined>;
  lookupDeployment: VercelDeploymentLookup;
  lookupDomain: VercelDomainLookup;
  lookupPromotionGate: VercelPromotionGateLookup;
  databaseEvidence?: VerifiedReleaseEvidence;
  currentSchemaFingerprints?: Record<string, string | undefined>;
};

const REVISION = /^[0-9a-f]{7,64}$/i;
const PROVIDER_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const CHECK_NAME = /^[A-Za-z0-9][A-Za-z0-9._:/ -]*$/;
const SHA256 = /^[0-9a-f]{64}$/i;
const VERIFIED_RESULTS = new WeakMap<object, { project: string;
  environment: "preview" | "production"; revision: string }>();

export function isVerifiedVercelWebResult(
  results: VercelWebVerification[], plan: ReleasePlan,
) {
  const binding = VERIFIED_RESULTS.get(results);
  return Boolean(binding && binding.project === plan.project &&
    binding.environment === plan.environment && binding.revision === plan.revision);
}

function validDomain(domain: string) {
  if (!domain || domain.includes("/") || domain.includes("@") ||
      domain.includes(":") || domain.endsWith(".")) return false;
  try {
    const url = new URL(`https://${domain}`);
    return url.hostname === domain.toLowerCase() &&
      url.pathname === "/" && url.port === "" &&
      domain.includes(".");
  } catch {
    return false;
  }
}

function validDeploymentUrl(url: string) {
  if (typeof url !== "string") return false;
  const domain = url.startsWith("https://") ? url.slice("https://".length) : url;
  return validDomain(domain);
}

function expectedTarget(
  environment: "preview" | "production",
  config: VercelWebTarget,
) {
  return environment === "production"
    ? ["production"]
    : config.previewProviderTarget
      ? [config.previewProviderTarget]
      : [null, "preview"];
}

function result(
  config: VercelWebTarget,
  environment: "preview" | "production",
  reason: VercelWebVerification["reason"],
  deploymentId: string | null = null,
  url: string | null = null,
): VercelWebVerification {
  return {
    targetId: config.targetId,
    projectId: config.projectId,
    environment,
    deploymentId,
    url,
    ready: reason === "ready",
    reason,
  };
}

function needsDatabaseProof(manifest: ReleaseManifest, plan: ReleasePlan, webId: string) {
  const web = manifest.targets.find((target) => target.id === webId)!;
  return (web.prerequisites ?? []).filter((id) =>
    plan.actions.some((action) =>
      action.targetId === id && action.targetKind === "database" &&
      action.action === "db-push"));
}

function databaseProofBeforePromotion(
  input: VerifyVercelWebInput,
  ids: string[],
  promotionTime: string | null,
) {
  if (ids.length === 0) return "ready" as const;
  if (promotionTime !== null &&
      !Number.isFinite(Date.parse(promotionTime))) {
    return "promotion-time-unverified" as const;
  }
  const evidence = input.databaseEvidence;
  if (!evidence || evidence.project !== input.plan.project ||
      evidence.environment !== input.plan.environment) return "db-proof-missing" as const;
  for (const id of ids) {
    let receipt;
    try {
      receipt = latestVerifiedReceiptForTarget(evidence, id);
    } catch {
      return "db-proof-missing" as const;
    }
    const fingerprint = input.currentSchemaFingerprints?.[id];
    if (!receipt || receipt.action !== "db-push" ||
        receipt.revision !== input.plan.revision ||
        receipt.environment !== input.plan.environment ||
        receipt.fingerprint.kind !== "schema" ||
        typeof fingerprint !== "string" || !SHA256.test(fingerprint) ||
        receipt.fingerprint.value !== fingerprint) {
      return "db-proof-missing" as const;
    }
    if (promotionTime !== null && receipt.completedAt > promotionTime) {
      return "db-after-promotion" as const;
    }
  }
  return "ready" as const;
}

/**
 * Verify required web actions against Vercel deployment metadata. The lookup
 * callbacks must query authenticated provider state. A READY build alone does
 * not prove Production domain promotion.
 */
export async function verifyVercelWebDeployments(
  input: VerifyVercelWebInput,
): Promise<VercelWebVerification[]> {
  validateReleaseManifest(input.manifest);
  const { plan, manifest } = input;
  if (!plan || plan.project !== manifest.project ||
      !["preview", "production"].includes(plan.environment) ||
      !REVISION.test(plan.revision ?? "") ||
      !Array.isArray(input.configs) ||
      !input.deploymentIds || typeof input.deploymentIds !== "object" ||
      typeof input.lookupDeployment !== "function" ||
      typeof input.lookupDomain !== "function" ||
      typeof input.lookupPromotionGate !== "function") {
    throw new Error("Vercel verification needs a matching release plan and provider lookups.");
  }
  const environment = plan.environment;
  const activeWeb = manifest.targets.filter((target) =>
    target.kind === "web" && target.environments.includes(environment));
  const configs = new Map<string, VercelWebTarget>();
  for (const config of input.configs) {
    if (!config || !PROVIDER_ID.test(config.targetId ?? "") ||
        !PROVIDER_ID.test(config.projectId ?? "") ||
        (config.teamId && !PROVIDER_ID.test(config.teamId)) ||
        (config.previewProviderTarget &&
          !PROVIDER_ID.test(config.previewProviderTarget)) ||
        (config.commitMetaKey && !PROVIDER_ID.test(config.commitMetaKey)) ||
        (config.dbGateCheckName && !CHECK_NAME.test(config.dbGateCheckName)) ||
        (config.previewDomain && !validDomain(config.previewDomain)) ||
        (config.productionDomain && !validDomain(config.productionDomain)) ||
        configs.has(config.targetId) ||
        !manifest.targets.some((target) =>
          target.id === config.targetId && target.kind === "web")) {
      throw new Error("Invalid or duplicate Vercel web target configuration.");
    }
    configs.set(config.targetId, config);
  }
  const verified: VercelWebVerification[] = [];
  for (const web of activeWeb) {
    const configured = configs.get(web.id);
    const config = configured ?? { targetId: web.id, projectId: "unconfigured" };
    const required = plan.actions.some((action) =>
      action.targetId === web.id && action.targetKind === "web" &&
      action.action === "web-deploy");
    if (!required) {
      verified.push(result(config, environment, "not-required"));
      continue;
    }
    if (!configured || (environment === "production" &&
        !configured.productionDomain)) {
      verified.push(result(config, environment, "configuration-missing"));
      continue;
    }
    const id = input.deploymentIds[web.id];
    if (!id || !PROVIDER_ID.test(id)) {
      verified.push(result(config, environment, "deployment-missing"));
      continue;
    }
    let deployment: VercelDeploymentMetadata | null;
    try {
      deployment = await input.lookupDeployment(id, config.teamId);
    } catch {
      verified.push(result(config, environment, "provider-unavailable", id));
      continue;
    }
    if (!deployment) {
      verified.push(result(config, environment, "deployment-missing", id));
      continue;
    }
    const metaSha = deployment.meta?.[config.commitMetaKey ?? "githubCommitSha"];
    const sourceSha = deployment.gitSource?.sha;
    if (deployment.id !== id || deployment.projectId !== config.projectId ||
        deployment.readyState !== "READY" ||
        !expectedTarget(environment, config).includes(deployment.target) ||
        (!metaSha && !sourceSha) ||
        (metaSha && metaSha !== plan.revision) ||
        (sourceSha && sourceSha !== plan.revision) ||
        !validDeploymentUrl(deployment.url)) {
      verified.push(result(config, environment, "deployment-mismatch", id));
      continue;
    }
    const needsDb = needsDatabaseProof(manifest, plan, web.id);
    if (environment === "production" && needsDb.length > 0) {
      let gate: VercelPromotionGate | null;
      try {
        gate = await input.lookupPromotionGate(config.projectId, config.teamId);
      } catch {
        gate = null;
      }
      if (!gate?.active || !["deployment-checks", "manual-promotion"].includes(gate.mode) ||
          (gate.mode === "deployment-checks" &&
            (!config.dbGateCheckName ||
              !gate.requiredChecks?.includes(config.dbGateCheckName)))) {
        verified.push(result(config, environment, "promotion-hold-missing", id));
        continue;
      }
    }
    const domain = environment === "production"
      ? config.productionDomain : config.previewDomain;
    let assignment: VercelDomainAssignment | null = null;
    if (domain) {
      try {
        assignment = await input.lookupDomain(domain, config.teamId);
      } catch {
        assignment = null;
      }
      if (!assignment) {
        verified.push(result(config, environment, "domain-unassigned", id));
        continue;
      }
      if (assignment.deploymentId !== id) {
        verified.push(result(config, environment, "domain-mismatch", id));
        continue;
      }
    }
    if (environment === "production" && deployment.readySubstate &&
        deployment.readySubstate !== "PROMOTED") {
      verified.push(result(config, environment, "domain-unassigned", id));
      continue;
    }
    const dbStatus = databaseProofBeforePromotion(input, needsDb,
      environment === "production" ? assignment?.assignedAt ?? "" : null);
    if (dbStatus !== "ready") {
      verified.push(result(config, environment, dbStatus, id));
      continue;
    }
    verified.push(result(config, environment, "ready", id,
      `https://${deployment.url.replace(/^https:\/\//, "")}`));
  }
  const results = Object.freeze(verified.map((item) => Object.freeze(item))) as
    unknown as VercelWebVerification[];
  VERIFIED_RESULTS.set(results, { project: plan.project,
    environment, revision: plan.revision });
  return results;
}

/** A direct Vercel deployment lookup; the token must come from scoped CI secrets. */
export function createVercelDeploymentLookup(
  token: string,
  fetcher: (url: URL, init: { headers: Record<string, string> }) => Promise<Response> =
    (url, init) => fetch(url, init),
): VercelDeploymentLookup {
  if (!token) throw new Error("Vercel lookup needs a scoped access token.");
  return async (deploymentId, teamId) => {
    if (!PROVIDER_ID.test(deploymentId) ||
        (teamId && !PROVIDER_ID.test(teamId))) {
      throw new Error("Invalid Vercel deployment identity.");
    }
    const url = new URL(`https://api.vercel.com/v13/deployments/${deploymentId}`);
    if (teamId) url.searchParams.set("teamId", teamId);
    const response = await fetcher(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Vercel deployment metadata unavailable.");
    const payload = await response.json() as Record<string, unknown>;
    return {
      id: String(payload.id ?? payload.uid ?? ""),
      projectId: String(payload.projectId ?? ""),
      readyState: String(payload.readyState ?? ""),
      target: typeof payload.target === "string" ? payload.target : null,
      url: String(payload.url ?? ""),
      meta: typeof payload.meta === "object" && payload.meta &&
        !Array.isArray(payload.meta)
        ? payload.meta as Record<string, string> : undefined,
      gitSource: typeof payload.gitSource === "object" && payload.gitSource &&
        typeof (payload.gitSource as { sha?: unknown }).sha === "string"
        ? { sha: (payload.gitSource as { sha: string }).sha } : undefined,
      readySubstate: typeof payload.readySubstate === "string"
        ? payload.readySubstate : null,
    };
  };
}

/** Resolve the deployment currently behind a domain through Vercel's alias-aware GET. */
export function createVercelDomainLookup(
  token: string,
  fetcher: (url: URL, init: { headers: Record<string, string> }) => Promise<Response> =
    (url, init) => fetch(url, init),
): VercelDomainLookup {
  if (!token) throw new Error("Vercel domain lookup needs a scoped access token.");
  return async (domain, teamId) => {
    if (!validDomain(domain) || (teamId && !PROVIDER_ID.test(teamId))) {
      throw new Error("Invalid Vercel domain identity.");
    }
    const url = new URL("https://api.vercel.com/v13/deployments/alias");
    url.searchParams.set("url", domain);
    if (teamId) url.searchParams.set("teamId", teamId);
    const response = await fetcher(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Vercel domain metadata unavailable.");
    const payload = await response.json() as Record<string, unknown>;
    const deploymentId = payload.id ?? payload.uid;
    if (typeof deploymentId !== "string" || !PROVIDER_ID.test(deploymentId)) {
      throw new Error("Vercel domain metadata lacks deployment identity.");
    }
    const assigned = payload.aliasAssignedAt ?? payload.aliasAssigned;
    const assignedAt = typeof assigned === "number" && Number.isFinite(assigned)
      ? new Date(assigned).toISOString() : "";
    return { deploymentId, assignedAt };
  };
}
