import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  databaseUrlEnvNamesForProfile,
  databaseUrlForProfile,
  envPrefixForProfile,
  type EnvRecord,
  loadModeEnv,
} from "./env";
import { findWorkspaceRoot } from "./with-env";

export type DatabaseAction =
  | "drizzle-studio"
  | "generate"
  | "migrate"
  | "pull"
  | "push"
  | "shell"
  | "studio";
export type DatabaseMode = "local" | "dev" | "prod" | "preview";

export type DatabaseCommandOptions = {
  action: DatabaseAction;
  mode: DatabaseMode;
  passthrough: string[];
  profile: string;
  workspaceRoot: string;
};

const ACTIONS = new Set<DatabaseAction>([
  "drizzle-studio",
  "generate",
  "migrate",
  "pull",
  "push",
  "shell",
  "studio",
]);
const MODE_FLAGS = new Map<string, DatabaseMode>([
  ["--local", "local"],
  ["--dev", "dev"],
  ["--preview", "preview"],
  ["--prod", "prod"],
]);

export function parseDatabaseCommandArgs(
  argv: string[],
  cwd = process.cwd(),
): DatabaseCommandOptions {
  let action: DatabaseAction | undefined;
  let profile: string | undefined;
  let mode: DatabaseMode = "local";
  let explicitMode: DatabaseMode | undefined;
  const passthrough: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      passthrough.push(...argv.slice(index + 1));
      break;
    }

    if (arg === "--profile") {
      if (profile !== undefined) {
        throw new Error("Database command profile was supplied more than once.");
      }

      const value = argv[index + 1];

      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --profile.");
      }

      profile = value;
      index += 1;
      continue;
    }

    if (arg?.startsWith("--profile=")) {
      if (profile !== undefined) {
        throw new Error("Database command profile was supplied more than once.");
      }

      const value = arg.slice("--profile=".length);

      if (!value) {
        throw new Error("Missing value for --profile.");
      }

      profile = value;
      continue;
    }

    const nextMode = MODE_FLAGS.get(arg ?? "");

    if (nextMode) {
      if (explicitMode && explicitMode !== nextMode) {
        throw new Error(
          `Conflicting database command modes: --${explicitMode} and --${nextMode}. Choose one.`,
        );
      }

      explicitMode = nextMode;
      mode = nextMode;
      continue;
    }

    if (arg?.startsWith("--")) {
      throw new Error(
        `Unknown database command flag: ${arg}. Use --local, --dev, --preview, --prod, or -- for command arguments.`,
      );
    }

    if (!action) {
      if (!ACTIONS.has(arg as DatabaseAction)) {
        throw new Error(`Unknown database action: ${arg}.`);
      }

      action = arg as DatabaseAction;
      continue;
    }

    throw new Error(`Unexpected database command argument: ${arg}.`);
  }

  if (!action) {
    throw new Error("Missing database action.");
  }

  if (!profile) {
    throw new Error("Missing --profile <project-name>.");
  }

  return {
    action,
    mode,
    passthrough,
    profile,
    workspaceRoot: findWorkspaceRoot(cwd),
  };
}

export function resolveDatabaseCommandEnv(
  options: DatabaseCommandOptions,
  processEnv: EnvRecord = process.env,
): EnvRecord {
  const selectedEnv = selectedModeEnv(options);
  const databaseUrl = databaseUrlForProfile(options.profile, selectedEnv);

  if (!databaseUrl && options.action !== "generate") {
    throw new Error(
      `Missing ${databaseUrlEnvNamesForProfile(options.profile)} for db:${options.action} --${options.mode}. Set it in ${selectedModeFile(options)}.`,
    );
  }

  if (databaseUrl) {
    assertValidDatabaseUrl(options.mode, databaseUrl);

    if (options.mode !== "prod" && options.action !== "generate") {
      const productionUrl = productionDatabaseUrl(options);

      if (!productionUrl) {
        throw new Error(
          `Cannot verify the ${options.mode} database target: production ${databaseUrlEnvNamesForProfile(options.profile)} is missing.`,
        );
      }

      assertValidDatabaseUrl("prod", productionUrl);

      if (databaseTargetsEqual(databaseUrl, productionUrl)) {
        throw new Error(
          `Refusing db:${options.action} because the ${options.mode} database target resolves to production. Select --prod explicitly to target production.`,
        );
      }
    }
  }

  const profileEnvPrefix = envPrefixForProfile(options.profile);
  const shellEnv = shellPasswordEnv(options.action, databaseUrl);

  return {
    ...processEnv,
    ...selectedEnv,
    ...shellEnv,
    APP_ENV: options.mode === "prod" ? "production" : options.mode,
    DEV_PROFILE: options.mode,
    [`${profileEnvPrefix}_DB_MODE`]:
      options.mode === "preview" ? "preview" : options.mode,
    [`${profileEnvPrefix}_ENV_MODE`]: options.mode,
    [`${profileEnvPrefix}_WORKSPACE_ROOT`]: options.workspaceRoot,
  };
}

export function assertValidDatabaseUrl(
  mode: DatabaseMode,
  databaseUrl: string | undefined,
) {
  if (!databaseUrl?.trim()) {
    throw new Error(`Missing database URL for --${mode}.`);
  }

  try {
    new URL(databaseUrl);
  } catch {
    throw new Error(`Invalid database URL for --${mode}.`);
  }
}

export function isLocalDatabaseHostname(hostname: string) {
  const normalized = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized === "mysql" ||
    normalized === "postgres" ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized) ||
    normalized === "::ffff:7f00:1" ||
    normalized.startsWith("::ffff:127.")
  );
}

export function databaseTargetFingerprint(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const pathname = url.pathname === "/" ? "" : url.pathname;
  const identity = url.username
    ? createHash("sha256").update(url.username).digest("hex").slice(0, 8)
    : "anonymous";

  return `${url.protocol}//${url.host}${pathname}#identity=${identity}`;
}

export function databaseTargetsEqual(left: string, right: string) {
  const leftUrl = new URL(left);
  const rightUrl = new URL(right);
  const leftSupabaseProject = supabaseProjectRef(leftUrl);
  const rightSupabaseProject = supabaseProjectRef(rightUrl);

  if (leftSupabaseProject || rightSupabaseProject) {
    return (
      Boolean(leftSupabaseProject) &&
      leftSupabaseProject === rightSupabaseProject &&
      normalizedDatabaseProtocol(leftUrl.protocol) ===
        normalizedDatabaseProtocol(rightUrl.protocol) &&
      normalizedDatabasePath(leftUrl.pathname) ===
        normalizedDatabasePath(rightUrl.pathname)
    );
  }

  const sameEndpoint =
    normalizedDatabaseProtocol(leftUrl.protocol) ===
      normalizedDatabaseProtocol(rightUrl.protocol) &&
    normalizedDatabaseHostname(leftUrl.hostname) ===
      normalizedDatabaseHostname(rightUrl.hostname) &&
    effectivePort(leftUrl) === effectivePort(rightUrl) &&
    normalizedDatabasePath(leftUrl.pathname) ===
      normalizedDatabasePath(rightUrl.pathname);

  if (!sameEndpoint) {
    return false;
  }

  const branchScopedProvider = databaseUsernameIdentifiesTarget(leftUrl.hostname);
  const distinctBranchUsernames =
    branchScopedProvider &&
    Boolean(leftUrl.username) &&
    Boolean(rightUrl.username) &&
    decodeUrlComponent(leftUrl.username) !==
      decodeUrlComponent(rightUrl.username);

  // Credentials normally authenticate access to an endpoint; they do not
  // identify a database. PlanetScale is the explicit exception used here:
  // branch-scoped usernames may distinguish branches on one endpoint/path.
  // Password changes alone never distinguish a target.
  return !distinctBranchUsernames;
}

export function assertProductionConfirmation(
  mode: DatabaseMode,
  fingerprint: string,
  confirmation: string,
) {
  if (mode === "prod" && confirmation.trim() !== fingerprint) {
    throw new Error(
      "Production database command cancelled: target confirmation did not match.",
    );
  }
}

function assertProductionPushConfirmation(confirmation: string) {
  if (confirmation.trim().toLowerCase() !== "y") {
    throw new Error("Production database command cancelled.");
  }
}

export function productionConfirmation(
  action: DatabaseAction,
  fingerprint: string,
) {
  if (action === "push") {
    return {
      assert: (confirmation: string) =>
        assertProductionPushConfirmation(confirmation),
      nonInteractiveError:
        "Production db:push requires an interactive terminal for confirmation.",
      prompt:
        "You are about to push to a production database. Do you want to proceed? (y/N) ",
    };
  }

  return {
    assert: (confirmation: string) =>
      assertProductionConfirmation("prod", fingerprint, confirmation),
    nonInteractiveError: `Production db:${action} requires an interactive terminal to confirm ${fingerprint}.`,
    prompt: `Type the production target "${fingerprint}" to continue: `,
  };
}

export function shouldStartLocalServices(options: DatabaseCommandOptions) {
  return options.mode === "local" && options.action !== "generate";
}

export function shouldConfirmProduction(options: DatabaseCommandOptions) {
  return options.mode === "prod" && options.action !== "generate";
}

export function commandForDatabaseAction(
  options: DatabaseCommandOptions,
  databaseUrl: string | undefined,
) {
  if (options.action === "shell") {
    return shellCommand(databaseUrl, options.passthrough);
  }

  const packageScript =
    options.action === "migrate" && options.mode === "prod"
      ? "db:migrate:deploy"
      : options.action === "drizzle-studio"
        ? "db:drizzle:studio"
        : `db:${options.action}`;

  return [
    "bun",
    "--env-file=/dev/null",
    "run",
    packageScript,
    ...options.passthrough,
  ];
}

export function dbPackageDirectory(options: DatabaseCommandOptions) {
  return resolve(options.workspaceRoot, "packages/db");
}

function selectedModeEnv(options: DatabaseCommandOptions) {
  return loadModeEnv(options.workspaceRoot, options.mode, options.profile);
}

function productionDatabaseUrl(options: DatabaseCommandOptions) {
  return databaseUrlForProfile(
    options.profile,
    selectedModeEnv({ ...options, mode: "prod" }),
  );
}

function normalizedDatabaseProtocol(protocol: string) {
  return protocol === "postgres:" || protocol === "postgresql:"
    ? "postgresql:"
    : protocol;
}

function normalizedDatabaseHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");

  if (normalized.endsWith(".neon.tech")) {
    const labels = normalized.split(".");
    const endpoint = labels[0];

    if (endpoint?.endsWith("-pooler")) {
      labels[0] = endpoint.slice(0, -"-pooler".length);
      return labels.join(".");
    }
  }

  return normalized;
}

function normalizedDatabasePath(pathname: string) {
  try {
    const normalized = decodeURIComponent(pathname);
    return normalized === "/" ? "" : normalized;
  } catch {
    return pathname === "/" ? "" : pathname;
  }
}

function supabaseProjectRef(url: URL) {
  const hostname = normalizedDatabaseHostname(url.hostname);
  const directMatch = hostname.match(/^db\.([^.]+)\.supabase\.co$/);

  if (directMatch?.[1]) {
    return decodeUrlComponent(directMatch[1]).toLowerCase();
  }

  if (
    hostname === "pooler.supabase.com" ||
    hostname.endsWith(".pooler.supabase.com")
  ) {
    const username = decodeUrlComponent(url.username);
    const separatorIndex = username.lastIndexOf(".");

    if (separatorIndex >= 0 && separatorIndex < username.length - 1) {
      return username.slice(separatorIndex + 1).toLowerCase();
    }
  }

  return undefined;
}

function decodeUrlComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function effectivePort(url: URL) {
  if (url.port) {
    return url.port;
  }

  if (url.protocol === "postgresql:" || url.protocol === "postgres:") {
    return "5432";
  }

  if (url.protocol === "mysql:") {
    return "3306";
  }

  return "";
}

function databaseUsernameIdentifiesTarget(hostname: string) {
  const normalized = normalizedDatabaseHostname(hostname);
  return (
    normalized === "psdb.cloud" ||
    normalized.endsWith(".psdb.cloud") ||
    normalized === "pooler.supabase.com" ||
    normalized.endsWith(".pooler.supabase.com")
  );
}

function selectedModeFile(options: DatabaseCommandOptions) {
  if (options.mode === "local") {
    return ".env.local";
  }

  if (options.mode === "preview") {
    return ".env.preview";
  }

  if (options.mode === "dev") {
    return ".env.dev";
  }

  return ".env.production";
}

function shellPasswordEnv(action: DatabaseAction, databaseUrl: string | undefined) {
  if (action !== "shell" || !databaseUrl) {
    return {};
  }

  const url = new URL(databaseUrl);

  return url.protocol === "mysql:" && url.password
    ? { MYSQL_PWD: decodeURIComponent(url.password) }
    : {};
}

function shellCommand(databaseUrl: string | undefined, passthrough: string[]) {
  if (!databaseUrl) {
    throw new Error("Missing database URL for db:shell.");
  }

  const url = new URL(databaseUrl);

  if (url.protocol !== "mysql:") {
    return ["psql", databaseUrl, ...passthrough];
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));

  return [
    "mysql",
    "--host",
    url.hostname,
    ...(url.port ? ["--port", url.port] : []),
    ...(url.username ? ["--user", decodeURIComponent(url.username)] : []),
    ...(databaseName ? [databaseName] : []),
    ...passthrough,
  ];
}
