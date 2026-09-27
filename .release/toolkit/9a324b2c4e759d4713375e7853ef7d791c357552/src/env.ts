import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type EnvRecord = Record<string, string | undefined>;

const NAMESPACED_DATABASE_URL_PROFILES = new Set(["HALAALVEST"]);

export function envPrefixForProfile(profile: string) {
  return profile
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

export function databaseUrlEnvKeyForProfile(profile: string) {
  return `${envPrefixForProfile(profile)}_DATABASE_URL`;
}

export function databaseUrlForProfile(profile: string, env: EnvRecord) {
  const profileKey = databaseUrlEnvKeyForProfile(profile);
  const profileValue = env[profileKey]?.trim();

  if (profileValue) {
    return profileValue;
  }

  if (NAMESPACED_DATABASE_URL_PROFILES.has(envPrefixForProfile(profile))) {
    return undefined;
  }

  return env.DATABASE_URL?.trim() || undefined;
}

export function databaseUrlEnvNamesForProfile(profile: string) {
  const profileKey = databaseUrlEnvKeyForProfile(profile);

  return NAMESPACED_DATABASE_URL_PROFILES.has(envPrefixForProfile(profile))
    ? profileKey
    : `${profileKey} or DATABASE_URL`;
}

export function dbNameForProfile(profile: string) {
  return profile
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export function parseEnvFile(contents: string): EnvRecord {
  const parsed: EnvRecord = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

export function readEnvFile(filePath: string): EnvRecord {
  if (!existsSync(filePath)) {
    return {};
  }

  return parseEnvFile(readFileSync(filePath, "utf8"));
}

export function envFileForMode(mode: string) {
  if (mode === "production" || mode === "prod") {
    return ".env.production";
  }

  if (mode === "local") {
    return ".env.local";
  }

  if (mode === "dev" || mode === "development") {
    return ".env.dev";
  }

  if (mode === "preview") {
    return ".env.preview";
  }

  throw new Error(
    `Unknown env mode "${mode}". Use "local", "dev", "preview", or "prod".`,
  );
}

export function loadModeEnv(
  workspaceRoot: string,
  mode: string,
  profile?: string,
): EnvRecord {
  const baseEnv = readEnvFile(resolve(workspaceRoot, ".env"));
  const modeEnv = readEnvFile(resolve(workspaceRoot, envFileForMode(mode)));
  const profileDatabaseUrlKey = profile
    ? databaseUrlEnvKeyForProfile(profile)
    : undefined;

  return {
    ...baseEnv,
    ...modeEnv,
    DATABASE_URL: modeEnv.DATABASE_URL,
    ...(profileDatabaseUrlKey
      ? { [profileDatabaseUrlKey]: modeEnv[profileDatabaseUrlKey] }
      : {}),
  };
}

export function loadRootEnv(workspaceRoot: string, mode = "local"): EnvRecord {
  return loadModeEnv(workspaceRoot, mode);
}
