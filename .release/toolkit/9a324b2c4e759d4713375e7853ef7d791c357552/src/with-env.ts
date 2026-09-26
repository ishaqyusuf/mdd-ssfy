import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyManagedDatabaseUrl } from "./database-target";
import {
  databaseUrlEnvKeyForProfile,
  databaseUrlEnvNamesForProfile,
  databaseUrlForProfile,
  envPrefixForProfile,
  type EnvRecord,
  loadModeEnv,
} from "./env";

export type WithEnvOptions = {
  command: string[];
  mode: string;
  profile: string;
  redisMode?: InfraMode;
  workspaceRoot: string;
};

type InfraMode = "local" | "preview";

const GND_LOCAL_REDIS_URL = "redis://localhost:6379";

export function findWorkspaceRoot(startDir: string): string {
  let currentDir = resolve(startDir);

  while (true) {
    const packageJsonPath = resolve(currentDir, "package.json");

    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
        workspaces?: unknown;
      };

      if (Array.isArray(packageJson.workspaces)) {
        return currentDir;
      }
    }

    const parentDir = resolve(currentDir, "..");

    if (parentDir === currentDir) {
      throw new Error(`Could not find a workspace root from ${startDir}.`);
    }

    currentDir = parentDir;
  }
}

export function parseWithEnvArgs(
  argv: string[],
  inputEnv: EnvRecord = process.env,
  cwd = process.cwd(),
): WithEnvOptions {
  let profile: string | undefined;
  let mode: string | undefined;
  let redisMode: InfraMode | undefined;
  const command: string[] = [];
  let index = 0;

  while (index < argv.length) {
    const arg = argv[index];

    if (arg === "--") {
      command.push(...argv.slice(index + 1));
      break;
    }

    if (arg === "--profile") {
      profile = argv[index + 1];
      index += 2;
      continue;
    }

    if (arg?.startsWith("--profile=")) {
      profile = arg.slice("--profile=".length);
      index += 1;
      continue;
    }

    if (arg === "--mode") {
      mode = argv[index + 1];
      index += 2;
      continue;
    }

    if (arg?.startsWith("--mode=")) {
      mode = arg.slice("--mode=".length);
      index += 1;
      continue;
    }

    if (arg === "--redis") {
      index += 1;
      const value = argv[index];

      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --redis.");
      }

      redisMode = normalizeInfraMode(value, "--redis");
      index += 1;
      continue;
    }

    command.push(...argv.slice(index));
    break;
  }

  if (!profile) {
    throw new Error("Missing --profile <project-name>.");
  }

  const profileEnvPrefix = envPrefixForProfile(profile);

  return {
    command,
    mode: mode || inputEnv[`${profileEnvPrefix}_ENV_MODE`] || "local",
    profile,
    ...(redisMode ? { redisMode } : {}),
    workspaceRoot: findWorkspaceRoot(cwd),
  };
}

export function splitInlineEnv(command: string[]) {
  const inlineEnv: EnvRecord = {};
  const remaining = [...command];

  while (remaining.length > 0) {
    const arg = remaining[0];
    const match = arg?.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      break;
    }

    inlineEnv[match[1]] = match[2];
    remaining.shift();
  }

  return { command: remaining, inlineEnv };
}

export function resolveWithEnv(
  options: Omit<WithEnvOptions, "command">,
  processEnv: EnvRecord = process.env,
) {
  const profileEnvPrefix = envPrefixForProfile(options.profile);
  const fileEnv = loadModeEnv(
    options.workspaceRoot,
    options.mode,
    options.profile,
  );
  const profileDatabaseUrlKey = databaseUrlEnvKeyForProfile(options.profile);
  const modeEnv = {
    [`${profileEnvPrefix}_ENV_MODE`]:
      normalizedModeForEnv(options.mode),
    [`${profileEnvPrefix}_WORKSPACE_ROOT`]: options.workspaceRoot,
  };
  const env =
    options.profile === "gnd"
      ? {
          ...fileEnv,
          ...processEnv,
          ...modeEnv,
          DATABASE_URL: fileEnv.DATABASE_URL,
          [profileDatabaseUrlKey]: fileEnv[profileDatabaseUrlKey],
        }
      : {
          ...processEnv,
          ...fileEnv,
          ...modeEnv,
        };
  const redisEnv =
    options.profile === "gnd" && options.redisMode === "preview"
      ? {
          ...loadModeEnv(options.workspaceRoot, "preview", options.profile),
          ...processEnv,
          ...modeEnv,
        }
      : env;

  return resolveRedisEnv(
    options.profile,
    options.mode,
    options.redisMode,
    resolveDatabaseEnv(options.profile, options.mode, env),
    redisEnv,
  );
}

export function resolveDatabaseEnv(
  profile: string,
  mode: string,
  env: EnvRecord,
): EnvRecord {
  if (
    mode !== "local" &&
    mode !== "dev" &&
    mode !== "development" &&
    mode !== "preview"
  ) {
    return env;
  }

  if (profile === "gnd") {
    return resolveGndDatabaseEnv(mode, env);
  }

  const profileEnvPrefix = envPrefixForProfile(profile);
  const normalizedMode = mode === "development" ? "dev" : mode;
  const isLocal = normalizedMode === "local";
  const databaseUrl = databaseUrlForProfile(profile, env);

  if (!databaseUrl) {
    throw new Error(
      `Missing ${databaseUrlEnvNamesForProfile(profile)} for ${normalizedMode} mode. Set it in .env.${normalizedMode}.`,
    );
  }

  const databaseTarget = classifyManagedDatabaseUrl(databaseUrl, "", {
    dockerHosts: new Set(["postgres"]),
  });
  const shouldStartPostgres = isLocal && databaseTarget.kind === "docker";
  const composeEnv = shouldStartPostgres
    ? postgresComposeEnvFromUrl(databaseUrl)
    : {};

  return {
    ...env,
    ...composeEnv,
    [`${profileEnvPrefix}_DB_MODE`]: normalizedMode,
    [`${profileEnvPrefix}_START_POSTGRES`]: shouldStartPostgres ? "1" : "auto",
  };
}

function postgresComposeEnvFromUrl(databaseUrl: string): EnvRecord {
  const url = new URL(databaseUrl);

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error(
      "Local database URL must use the postgres or postgresql protocol.",
    );
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const hostPort = url.port;
  const user = decodeURIComponent(url.username);

  if (!databaseName || !hostPort || !user || !url.password) {
    throw new Error(
      "Local database URL must include a user, password, port, and database name.",
    );
  }

  return {
    DB_HOST_PORT: hostPort,
    DB_NAME: databaseName,
    DB_PASSWORD: decodeURIComponent(url.password),
    DB_USER: user,
  };
}

export function resolveRedisEnv(
  profile: string,
  mode: string,
  redisMode: InfraMode | undefined,
  env: EnvRecord,
  redisEnv: EnvRecord = env,
): EnvRecord {
  if (profile !== "gnd" || mode === "prod" || mode === "production") {
    return env;
  }

  if (!redisMode) {
    return {
      ...env,
      GND_REDIS_MODE: undefined,
      GND_CACHE_NAMESPACE: undefined,
      REDIS_URL: undefined,
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
    };
  }

  if (redisMode === "local") {
    const redisUrl = redisEnv.REDIS_URL?.trim()
      ? redisEnv.REDIS_URL
      : GND_LOCAL_REDIS_URL;

    return {
      ...env,
      GND_REDIS_MODE: "local",
      GND_CACHE_NAMESPACE: "local",
      REDIS_URL: redisUrl,
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
    };
  }

  const previewRedisUrl = nonLocalEnvValue(redisEnv, "REDIS_URL");
  const previewRestUrl = redisEnv.UPSTASH_REDIS_REST_URL;
  const previewRestToken = redisEnv.UPSTASH_REDIS_REST_TOKEN;

  if (!previewRedisUrl && !previewRestUrl) {
    throw new Error(
      "Missing preview dev Redis configuration. Set REDIS_URL or UPSTASH_REDIS_REST_URL in .env.preview.",
    );
  }

  if (previewRestUrl && !previewRestToken && !previewRedisUrl) {
    throw new Error(
      "Missing preview dev Upstash Redis REST token. Set UPSTASH_REDIS_REST_TOKEN in .env.preview.",
    );
  }

  return {
    ...env,
    GND_REDIS_MODE: "preview",
    GND_CACHE_NAMESPACE: "dev",
    ...(previewRedisUrl
      ? { REDIS_URL: previewRedisUrl }
      : { REDIS_URL: undefined }),
    ...(previewRestUrl
      ? { UPSTASH_REDIS_REST_URL: previewRestUrl }
      : { UPSTASH_REDIS_REST_URL: undefined }),
    ...(previewRestToken
      ? { UPSTASH_REDIS_REST_TOKEN: previewRestToken }
      : { UPSTASH_REDIS_REST_TOKEN: undefined }),
  };
}

function resolveGndDatabaseEnv(mode: string, env: EnvRecord): EnvRecord {
  const normalizedMode = mode === "development" ? "dev" : mode;
  const isLocal = normalizedMode === "local";
  const databaseUrl = databaseUrlForProfile("gnd", env);

  if (!databaseUrl) {
    throw new Error(
      `Missing DATABASE_URL for ${normalizedMode} mode. Set it in .env.${normalizedMode}.`,
    );
  }

  const databaseTarget = classifyManagedDatabaseUrl(databaseUrl, "gnd-prisma2", {
    dockerHosts: new Set(["mysql"]),
    dockerLocalPorts: new Set(["3307"]),
  });
  const shouldStartMysql = isLocal && databaseTarget.kind === "docker";

  return {
    ...env,
    GND_DB_MODE: normalizedMode,
    GND_START_MYSQL: shouldStartMysql ? "1" : "auto",
  };
}

function nonLocalEnvValue(env: EnvRecord, key: string) {
  const value = env[key];

  return value && !isLocalUrl(value) ? value : undefined;
}

function isLocalUrl(value: string) {
  try {
    const hostname = new URL(value).hostname;

    return ["localhost", "127.0.0.1", "::1", "0.0.0.0", "mysql", "postgres"].includes(
      hostname,
    );
  } catch {
    return false;
  }
}

function normalizeInfraMode(value: string | undefined, name: string): InfraMode {
  if (value === "local") {
    return "local";
  }

  if (value === "preview") {
    return "preview";
  }

  throw new Error(`Invalid ${name} value: ${value}. Expected local or preview.`);
}


function normalizedModeForEnv(mode: string) {
  if (mode === "production" || mode === "prod") {
    return "prod";
  }

  if (mode === "preview") {
    return "preview";
  }

  if (mode === "dev" || mode === "development") {
    return "dev";
  }

  return "local";
}
