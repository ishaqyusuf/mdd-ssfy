import { execFileSync, spawnSync } from "node:child_process";
import { isAbsolute, relative, resolve } from "node:path";
import { matchesAny, validateReleaseManifest } from "./manifest";
import type { ReleaseManifest, ReleasePlan } from "./plan";

export type ExpoPlatform = "android" | "ios";
export type ExpoReleaseEnvironment = "preview" | "production";

export type ExpoChannelConfig = {
  profile: string;
  channel: string;
  branch: string;
};
export type ExpoMobileConfig = {
  targetId: string;
  projectId: string;
  appPath: string;
  platforms: ExpoPlatform[];
  preview: ExpoChannelConfig;
  production: ExpoChannelConfig;
};

export type ExpoCurrentState = {
  projectId: string;
  targetId: string;
  environment: ExpoReleaseEnvironment;
  revision: string;
  fingerprints: Record<ExpoPlatform, string | null>;
  runtimeVersions: Record<ExpoPlatform, string | null>;
};

export type EasCommand = {
  executable: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
};
export type EasJsonRunner = (command: EasCommand) => Promise<unknown>;
export type ExpoRuntimeLookup = (
  platform: ExpoPlatform,
  channel: ExpoChannelConfig,
  cwd: string,
) => Promise<string | null>;

export type ExpoBuildRecord = {
  id: string;
  projectId: string;
  platform: ExpoPlatform;
  profile: string;
  channel: string;
  revision: string;
  runtimeVersion: string;
  fingerprint: string;
  status: "finished" | "failed" | "pending";
  availability: "available" | "unavailable";
};

export type ExpoUpdateRecord = {
  groupId: string;
  projectId: string;
  platform: ExpoPlatform;
  channel: string;
  branch: string;
  revision: string;
  runtimeVersion: string;
  status: "published" | "failed" | "pending";
  rolloutPercentage: number;
};

export type ExpoChannelRecord = {
  projectId: string;
  channel: string;
  branch: string;
};

/** Lookup implementations must fetch authenticated EAS/store state. */
export type ExpoBuildLookup = (id: string) => Promise<ExpoBuildRecord | null>;
export type ExpoUpdateLookup = (id: string) => Promise<ExpoUpdateRecord | null>;
export type ExpoChannelLookup = (channel: string) => Promise<ExpoChannelRecord | null>;

export type ExpoPlatformDecision = {
  platform: ExpoPlatform;
  action: "mobile-build" | "mobile-update";
  ready: boolean;
  reason:
    | "build-ready"
    | "update-ready"
    | "fingerprint-unknown"
    | "runtime-unknown"
    | "channel-mismatch"
    | "baseline-build-missing"
    | "native-candidate-changed"
    | "native-fingerprint-changed"
    | "runtime-changed"
    | "runtime-not-bumped"
    | "build-missing-or-mismatched"
    | "update-missing-or-mismatched"
    | "provider-unavailable";
  buildId: string | null;
  updateGroupId: string | null;
};

export type ExpoMobileDecision = {
  project: string;
  targetId: string;
  environment: ExpoReleaseEnvironment;
  revision: string;
  action: "mobile-build" | "mobile-update";
  ready: boolean;
  platforms: ExpoPlatformDecision[];
};

export type DecideExpoReleaseInput = {
  manifest: ReleaseManifest;
  plan: ReleasePlan;
  config: ExpoMobileConfig;
  current: ExpoCurrentState;
  baselineBuildIds: Partial<Record<ExpoPlatform, string | null>>;
  newBuildIds: Partial<Record<ExpoPlatform, string | null>>;
  updateGroupIds: Partial<Record<ExpoPlatform, string | null>>;
  lookupBuild: ExpoBuildLookup;
  lookupUpdate: ExpoUpdateLookup;
  lookupChannel: ExpoChannelLookup;
};

const REVISION = /^[0-9a-f]{7,64}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const RUNTIME = /^[A-Za-z0-9][A-Za-z0-9._:+-]*$/;
const CURRENT_STATE = new WeakSet<ExpoCurrentState>();
const VERIFIED_DECISIONS = new WeakSet<object>();

export function isVerifiedExpoDecision(result: ExpoMobileDecision) {
  return VERIFIED_DECISIONS.has(result);
}

function assertRelativePath(root: string, path: string, allowRoot = false) {
  if (allowRoot && path === ".") return root;
  if (typeof path !== "string" || !path || isAbsolute(path) ||
      path.includes("\\") || path.split("/").some((part) =>
        part === "." || part === "..")) {
    throw new Error("Expo release paths must be repository-relative.");
  }
  const resolved = resolve(root, path);
  if (relative(root, resolved).startsWith("..")) {
    throw new Error("Expo release paths must stay in the consumer repository.");
  }
  return resolved;
}

function validateExpoConfig(config: ExpoMobileConfig) {
  if (!config || !ID.test(config.targetId ?? "") ||
      !ID.test(config.projectId ?? "") ||
      !Array.isArray(config.platforms) || config.platforms.length === 0 ||
      config.platforms.some((platform) => !["android", "ios"].includes(platform)) ||
      new Set(config.platforms).size !== config.platforms.length ||
      !config.preview || !config.production) {
    throw new Error("Invalid Expo project/platform release configuration.");
  }
  for (const channel of [config.preview, config.production]) {
    if (!ID.test(channel.profile ?? "") || !ID.test(channel.channel ?? "") ||
        !ID.test(channel.branch ?? "")) {
      throw new Error("Invalid Expo build profile, channel, or branch.");
    }
  }
  if (config.preview.channel === config.production.channel ||
      config.preview.branch === config.production.branch) {
    throw new Error("Expo Preview and Production must use isolated channels and branches.");
  }
}

function committedHead(root: string, revision: string) {
  try {
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (head !== revision && !head.startsWith(revision)) {
      throw new Error("stale release revision");
    }
  } catch {
    throw new Error("Expo fingerprint needs the checked-out release revision.");
  }
}

function hashFromJson(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const hash = (value as { hash?: unknown }).hash;
  return typeof hash === "string" && SHA256.test(hash) ? hash : null;
}

/**
 * Generate platform/profile-aware native fingerprints through a pinned EAS CLI
 * at the checked-out release SHA. Runtime lookup must read resolved app config.
 */
export async function generateExpoCurrentState(
  config: ExpoMobileConfig,
  environment: ExpoReleaseEnvironment,
  revision: string,
  workspaceRoot: string,
  easExecutable: string,
  runJson: EasJsonRunner = defaultEasJsonRunner,
  runtimeLookup: ExpoRuntimeLookup,
): Promise<ExpoCurrentState> {
  validateExpoConfig(config);
  if (!["preview", "production"].includes(environment) ||
      !REVISION.test(revision ?? "") || typeof runtimeLookup !== "function") {
    throw new Error("Expo state needs environment, revision, and runtime lookup.");
  }
  const root = resolve(workspaceRoot);
  const cwd = assertRelativePath(root, config.appPath, true);
  const executable = assertRelativePath(root, easExecutable);
  committedHead(root, revision);
  const channel = config[environment];
  const fingerprints: Record<ExpoPlatform, string | null> = {
    android: null, ios: null,
  };
  const runtimeVersions: Record<ExpoPlatform, string | null> = {
    android: null, ios: null,
  };
  for (const platform of config.platforms) {
    try {
      const payload = await runJson({
        executable,
        args: ["fingerprint:generate", "--build-profile", channel.profile,
          "--platform", platform, "--json", "--non-interactive"],
        cwd, env: process.env,
      });
      fingerprints[platform] = hashFromJson(payload);
    } catch {
      fingerprints[platform] = null;
    }
    try {
      const runtime = await runtimeLookup(platform, channel, cwd);
      runtimeVersions[platform] = typeof runtime === "string" &&
        RUNTIME.test(runtime) ? runtime : null;
    } catch {
      runtimeVersions[platform] = null;
    }
  }
  const result = Object.freeze({
    projectId: config.projectId,
    targetId: config.targetId,
    environment,
    revision,
    fingerprints: Object.freeze(fingerprints),
    runtimeVersions: Object.freeze(runtimeVersions),
  }) as ExpoCurrentState;
  CURRENT_STATE.add(result);
  return result;
}

function validBuild(
  record: ExpoBuildRecord | null,
  config: ExpoMobileConfig,
  environment: ExpoReleaseEnvironment,
  platform: ExpoPlatform,
) {
  const channel = config[environment];
  return Boolean(record && record.projectId === config.projectId &&
    record.platform === platform && record.profile === channel.profile &&
    record.channel === channel.channel && record.status === "finished" &&
    record.availability === "available" &&
    REVISION.test(record.revision) && SHA256.test(record.fingerprint) &&
    RUNTIME.test(record.runtimeVersion));
}

function validUpdate(
  record: ExpoUpdateRecord | null,
  config: ExpoMobileConfig,
  environment: ExpoReleaseEnvironment,
  platform: ExpoPlatform,
  revision: string,
  runtime: string,
) {
  const channel = config[environment];
  return Boolean(record && record.projectId === config.projectId &&
    record.platform === platform && record.channel === channel.channel &&
    record.branch === channel.branch && record.revision === revision &&
    record.runtimeVersion === runtime && record.status === "published" &&
    record.rolloutPercentage === 100);
}

function platformResult(
  platform: ExpoPlatform,
  action: ExpoPlatformDecision["action"],
  reason: ExpoPlatformDecision["reason"],
  buildId: string | null = null,
  updateGroupId: string | null = null,
): ExpoPlatformDecision {
  return {
    platform, action,
    ready: ["build-ready", "update-ready"].includes(reason),
    reason, buildId, updateGroupId,
  };
}

export async function decideExpoRelease(
  input: DecideExpoReleaseInput,
): Promise<ExpoMobileDecision> {
  validateReleaseManifest(input.manifest);
  validateExpoConfig(input.config);
  const { plan, manifest, config, current } = input;
  if (!plan || plan.project !== manifest.project ||
      !["preview", "production"].includes(plan.environment) ||
      !REVISION.test(plan.revision ?? "") ||
      !CURRENT_STATE.has(current) || current.projectId !== config.projectId ||
      current.targetId !== config.targetId ||
      current.environment !== plan.environment ||
      current.revision !== plan.revision ||
      !manifest.targets.some((target) =>
        target.id === config.targetId && target.kind === "mobile" &&
        target.environments.includes(plan.environment)) ||
      !input.baselineBuildIds || !input.newBuildIds || !input.updateGroupIds ||
      typeof input.lookupBuild !== "function" ||
      typeof input.lookupUpdate !== "function" ||
      typeof input.lookupChannel !== "function") {
    throw new Error("Expo decision needs a matching plan, verified current state, and provider lookups.");
  }
  const action = plan.actions.find((item) =>
    item.targetId === config.targetId && item.targetKind === "mobile");
  if (!action) {
    throw new Error("Expo decision needs a planned mobile action.");
  }
  const mobile = manifest.targets.find((target) => target.id === config.targetId)!;
  const nativeCandidate = action.changedPaths.some((path) =>
    matchesAny(path, mobile.nativeCandidatePaths ?? []));
  const unknownChange = action.reasons.some((reason) =>
    ["baseline-missing", "change-unknown"].includes(reason));
  const environment = plan.environment;
  const channel = config[environment];
  let linkedChannel: ExpoChannelRecord | null = null;
  try {
    linkedChannel = await input.lookupChannel(channel.channel);
  } catch {
    linkedChannel = null;
  }
  const channelMatches = linkedChannel?.projectId === config.projectId &&
    linkedChannel.channel === channel.channel &&
    linkedChannel.branch === channel.branch;
  const platforms: ExpoPlatformDecision[] = [];

  for (const platform of config.platforms) {
    const fingerprint = current.fingerprints[platform];
    const runtime = current.runtimeVersions[platform];
    let baseline: ExpoBuildRecord | null = null;
    const baselineId = input.baselineBuildIds[platform];
    if (baselineId && ID.test(baselineId)) {
      try { baseline = await input.lookupBuild(baselineId); } catch { baseline = null; }
    }
    const baselineKnown = validBuild(baseline, config, environment, platform) &&
      baseline?.id === baselineId;
    const nativeChanged = baselineKnown && fingerprint &&
      baseline!.fingerprint !== fingerprint;
    const runtimeChanged = baselineKnown && runtime &&
      baseline!.runtimeVersion !== runtime;
    const mustBuild = nativeCandidate || unknownChange || !baselineKnown ||
      !fingerprint || !runtime || nativeChanged || runtimeChanged;
    const selectedAction = mustBuild ? "mobile-build" : "mobile-update";
    let reason: ExpoPlatformDecision["reason"];
    if (!channelMatches) reason = "channel-mismatch";
    else if (!fingerprint) reason = "fingerprint-unknown";
    else if (!runtime) reason = "runtime-unknown";
    else if (nativeCandidate) reason = "native-candidate-changed";
    else if (!baselineKnown) reason = "baseline-build-missing";
    else if (nativeChanged) reason = "native-fingerprint-changed";
    else if (runtimeChanged) reason = "runtime-changed";
    else reason = "provider-unavailable";

    if (mustBuild) {
      const runtimeMustBump = baselineKnown && (nativeCandidate || nativeChanged) &&
        runtime === baseline!.runtimeVersion;
      if (runtimeMustBump) {
        platforms.push(platformResult(platform, selectedAction,
          "runtime-not-bumped"));
        continue;
      }
      if (!channelMatches || !fingerprint || !runtime) {
        platforms.push(platformResult(platform, selectedAction, reason));
        continue;
      }
      const buildId = input.newBuildIds[platform];
      let build: ExpoBuildRecord | null = null;
      if (buildId && ID.test(buildId)) {
        try { build = await input.lookupBuild(buildId); } catch { build = null; }
      }
      if (!validBuild(build, config, environment, platform) ||
          build!.id !== buildId || build!.revision !== plan.revision ||
          build!.fingerprint !== fingerprint ||
          build!.runtimeVersion !== runtime) {
        platforms.push(platformResult(platform, selectedAction,
          "build-missing-or-mismatched"));
        continue;
      }
      platforms.push(platformResult(platform, selectedAction,
        "build-ready", buildId));
      continue;
    }
    if (!channelMatches) {
      platforms.push(platformResult(platform, selectedAction, reason));
      continue;
    }
    const groupId = input.updateGroupIds[platform];
    let update: ExpoUpdateRecord | null = null;
    if (groupId && ID.test(groupId)) {
      try { update = await input.lookupUpdate(groupId); } catch { update = null; }
    }
    if (!validUpdate(update, config, environment, platform,
        plan.revision, runtime!) || update!.groupId !== groupId) {
      platforms.push(platformResult(platform, selectedAction,
        "update-missing-or-mismatched"));
      continue;
    }
    platforms.push(platformResult(platform, selectedAction,
      "update-ready", baselineId ?? null, groupId));
  }
  const result = Object.freeze({
    project: manifest.project, targetId: config.targetId,
    environment, revision: plan.revision,
    action: platforms.some((item) => item.action === "mobile-build")
      ? "mobile-build" : "mobile-update",
    ready: platforms.length === config.platforms.length &&
      platforms.every((item) => item.ready),
    platforms: Object.freeze(platforms.map((item) => Object.freeze(item))),
  }) as ExpoMobileDecision;
  VERIFIED_DECISIONS.add(result);
  return result;
}

async function defaultEasJsonRunner(command: EasCommand) {
  const result = spawnSync(command.executable, command.args, {
    cwd: command.cwd, env: command.env, encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"], maxBuffer: 2 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error("EAS metadata command failed.");
  try { return JSON.parse(result.stdout); } catch {
    throw new Error("EAS metadata JSON is unavailable.");
  }
}
