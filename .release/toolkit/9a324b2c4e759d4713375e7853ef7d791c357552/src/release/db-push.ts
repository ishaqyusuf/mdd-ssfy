import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import {
  assertValidDatabaseUrl,
  commandForDatabaseAction,
  databaseTargetFingerprint,
  databaseTargetsEqual,
  isLocalDatabaseHostname,
  resolveDatabaseCommandEnv,
  type DatabaseCommandOptions,
} from "../db-command";
import { databaseUrlForProfile, loadModeEnv } from "../env";
import type { ReleasePlan } from "./plan";

export type DatabasePushEnvironment = "preview" | "production";
export type DatabaseDiffRisk = "none" | "review" | "destructive";

export type DatabasePushRequest = {
  plan: ReleasePlan;
  targetId: string;
  profile: string;
  workspaceRoot: string;
  schemaPath: string;
  databasePackagePath?: string;
  prismaExecutable: string;
  prismaMajor: 6 | 7;
};

export type DatabaseDiffCommand = {
  executable: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
};

export type DatabaseDiffResult = { exitCode: number; stdout: string };
export type DatabaseDiffRunner = (
  command: DatabaseDiffCommand,
) => Promise<DatabaseDiffResult>;

export type DatabaseTargetResolution = {
  selectedUrl: string;
  productionUrl: string;
  env: NodeJS.ProcessEnv;
};
/** CI may supply secrets from protected environments through trusted code. */
export type DatabaseTargetResolver = (
  options: DatabaseCommandOptions,
) => Promise<DatabaseTargetResolution> | DatabaseTargetResolution;

export type DatabasePushPreflight = {
  project: string;
  targetId: string;
  environment: DatabasePushEnvironment;
  revision: string;
  targetFingerprint: string;
  schemaFingerprint: string;
  sqlFingerprint: string;
  diffDetected: boolean;
  risk: DatabaseDiffRisk;
};

export type ProtectedDatabaseApproval = {
  provider: "github-actions";
  project: string;
  targetId: string;
  environment: "production";
  revision: string;
  targetFingerprint: string;
  schemaFingerprint: string;
  sqlFingerprint: string;
  protectedEnvironment: true;
  backupReady: true;
  approvalId: string;
};
/** The lookup must inspect protected CI/environment metadata, not local JSON. */
export type ProtectedApprovalLookup = (
  preflight: DatabasePushPreflight,
) => Promise<ProtectedDatabaseApproval | null>;

export type DatabasePushCommandRunner = (
  command: DatabaseDiffCommand,
) => Promise<number>;

const REVISION = /^[0-9a-f]{7,64}$/i;
const PREFLIGHT_CONTEXT = new WeakMap<DatabasePushPreflight, {
  command: DatabaseDiffCommand;
}>();
const EXECUTED_PREFLIGHTS = new WeakSet<DatabasePushPreflight>();

function assertRelativeFile(root: string, file: string) {
  if (typeof file !== "string" || !file || isAbsolute(file) ||
      file.includes("\\") || /[\0\r\n]/.test(file) ||
      file.split("/").some((part) =>
        part === "." || part === "..")) {
    throw new Error("Database release needs repository-relative schema and executable paths.");
  }
  const path = resolve(root, file);
  if (relative(root, path).startsWith("..")) {
    throw new Error("Database release paths must stay inside the consumer repository.");
  }
  return path;
}

function packageDirectory(root: string, path: string) {
  if (path === ".") return root;
  return assertRelativeFile(root, path);
}

function workingSchemaFiles(root: string, schemaPath: string) {
  const absolute = resolve(root, schemaPath);
  const stat = lstatSync(absolute);
  if (stat.isSymbolicLink()) {
    throw new Error("Prisma schema paths cannot be symbolic links.");
  }
  if (stat.isFile()) return [schemaPath];
  if (!stat.isDirectory()) {
    throw new Error("Prisma schema path must be a file or directory.");
  }
  const files: string[] = [];
  const walk = (relativeDirectory: string) => {
    const directory = resolve(root, relativeDirectory);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isSymbolicLink()) {
        throw new Error("Prisma schema paths cannot contain symbolic links.");
      }
      if (entry.isDirectory()) walk(relativePath);
      else if (entry.isFile() && entry.name.endsWith(".prisma")) {
        files.push(relativePath);
      }
    }
  };
  walk(schemaPath);
  return files.sort();
}

function canonicalSchemaBundle(root: string, revision: string,
  schemaPath: string) {
  let committedFiles: string[];
  try {
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (head !== revision && !head.startsWith(revision)) {
      throw new Error("stale revision");
    }
    committedFiles = execFileSync("git", [
      "ls-tree", "-r", "--name-only", revision, "--", schemaPath,
    ], {
      cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).split("\n").filter((path) =>
      path === schemaPath || path.startsWith(`${schemaPath}/`))
      .filter((path) => path.endsWith(".prisma"))
      .sort();
  } catch {
    throw new Error("Could not verify the committed Prisma schema at the release revision.");
  }
  if (committedFiles.length === 0) {
    throw new Error("Could not verify the committed Prisma schema at the release revision.");
  }
  let workingFiles: string[];
  try {
    workingFiles = workingSchemaFiles(root, schemaPath);
  } catch {
    throw new Error("Could not read the consumer Prisma schema.");
  }
  if (JSON.stringify(workingFiles) !== JSON.stringify(committedFiles)) {
    throw new Error("Prisma schema differs from the committed release revision.");
  }
  const bundle: Array<{ path: string; content: string }> = [];
  for (const path of committedFiles) {
    let committed: string;
    let working: string;
    try {
      committed = execFileSync("git", ["show", `${revision}:${path}`], {
        cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
      });
      working = readFileSync(resolve(root, path), "utf8");
    } catch {
      throw new Error("Could not verify the committed Prisma schema at the release revision.");
    }
    if (working !== committed) {
      throw new Error("Prisma schema differs from the committed release revision.");
    }
    bundle.push({ path, content: committed });
  }
  return JSON.stringify(bundle);
}

function assertRawPushScriptSafe(packageDirectory: string) {
  let script: unknown;
  try {
    const pkg = JSON.parse(readFileSync(resolve(packageDirectory, "package.json"), "utf8"));
    script = pkg?.scripts?.["db:push"];
  } catch {
    throw new Error("Could not inspect the consumer raw db:push script.");
  }
  if (typeof script !== "string" ||
      !/^(?:(?:bunx|npx)\s+|bun\s+x\s+)?prisma\s+db\s+push\s*$/.test(script.trim())) {
    throw new Error("Consumer raw db:push script is missing or contains unsafe Prisma flags or overrides.");
  }
}

function diffRisk(sql: string, diffDetected: boolean): DatabaseDiffRisk {
  if (!diffDetected) return "none";
  if (/\b(?:DROP|TRUNCATE|DELETE\s+FROM)\b/i.test(sql) ||
      /\bALTER\s+TABLE\b[\s\S]*\bSET\s+NOT\s+NULL\b/i.test(sql)) {
    return "destructive";
  }
  return "review";
}

export function databasePushRequired(plan: ReleasePlan, targetId: string) {
  return plan.actions.some((action) =>
    action.targetId === targetId && action.targetKind === "database" &&
    action.action === "db-push");
}

function diffArguments(major: 6 | 7, schemaPath: string) {
  return major === 7
    ? ["migrate", "diff", "--from-config-datasource", `--to-schema=${schemaPath}`,
      "--script", "--exit-code"]
    : ["migrate", "diff", "--from-schema-datasource", schemaPath,
      "--to-schema-datamodel", schemaPath, "--script", "--exit-code"];
}

/**
 * Read-only preflight. The runner gets selected DB credentials privately;
 * neither its SQL nor raw URL appears in the returned preflight.
 */
export async function preflightDatabasePush(
  request: DatabasePushRequest,
  runDiff: DatabaseDiffRunner = defaultDiffRunner,
  resolveTarget: DatabaseTargetResolver = defaultTargetResolver,
): Promise<DatabasePushPreflight> {
  const { plan, targetId, profile, workspaceRoot, schemaPath,
    prismaExecutable, prismaMajor } = request;
  if (!plan || !["preview", "production"].includes(plan.environment) ||
      !REVISION.test(plan.revision ?? "") || !databasePushRequired(plan, targetId) ||
      typeof plan.project !== "string" || !plan.project ||
      typeof profile !== "string" || !profile ||
      ![6, 7].includes(prismaMajor)) {
    throw new Error("Database preflight requires a planned Preview/Production DB push.");
  }
  const root = resolve(workspaceRoot);
  assertRelativeFile(root, schemaPath);
  const executable = assertRelativeFile(root, prismaExecutable);
  const content = canonicalSchemaBundle(root, plan.revision, schemaPath);
  const mode = plan.environment === "production" ? "prod" : "preview";
  const options: DatabaseCommandOptions = {
    action: "push", mode, passthrough: [], profile, workspaceRoot: root,
  };
  const rawPackageDirectory = packageDirectory(
    root, request.databasePackagePath ?? "packages/db",
  );
  assertRawPushScriptSafe(rawPackageDirectory);
  let resolution: DatabaseTargetResolution;
  try {
    resolution = await resolveTarget(options);
  } catch (error) {
    if (resolveTarget === defaultTargetResolver && error instanceof Error) {
      throw error;
    }
    throw new Error("Could not resolve the selected hosted database profile.");
  }
  const { selectedUrl: url, productionUrl, env } = resolution ?? {};
  assertValidDatabaseUrl(mode, url);
  assertValidDatabaseUrl("prod", productionUrl);
  if (!env || typeof env !== "object" ||
      databaseUrlForProfile(profile, env) !== url) {
    throw new Error("Database runner environment does not match the selected profile target.");
  }
  if (mode === "preview" && databaseTargetsEqual(url, productionUrl)) {
    throw new Error("Refusing Preview DB push because its target resolves to production.");
  }
  if (isLocalDatabaseHostname(new URL(productionUrl).hostname)) {
    throw new Error("Production database profile cannot resolve to a local endpoint.");
  }
  if (isLocalDatabaseHostname(new URL(url).hostname)) {
    throw new Error("Hosted database push cannot target a local database endpoint.");
  }
  const command: DatabaseDiffCommand = {
    executable,
    args: diffArguments(prismaMajor, schemaPath),
    cwd: root,
    env,
  };
  let result: DatabaseDiffResult;
  try {
    result = await runDiff(command);
  } catch {
    throw new Error("Read-only Prisma schema diff preflight failed.");
  }
  if (!result || ![0, 2].includes(result.exitCode) ||
      typeof result.stdout !== "string") {
    throw new Error("Read-only Prisma schema diff preflight failed.");
  }
  if (result.exitCode === 0 &&
      /\b(?:CREATE|ALTER|DROP|TRUNCATE|DELETE\s+FROM)\b/i.test(result.stdout)) {
    throw new Error("Prisma diff output contradicts its empty exit code.");
  }
  const diffDetected = result.exitCode === 2;
  const preflight = Object.freeze({
    project: plan.project,
    targetId,
    environment: plan.environment as DatabasePushEnvironment,
    revision: plan.revision,
    targetFingerprint: databaseTargetFingerprint(url),
    schemaFingerprint: createHash("sha256").update(content).digest("hex"),
    sqlFingerprint: createHash("sha256").update(result.stdout).digest("hex"),
    diffDetected,
    risk: diffRisk(result.stdout, diffDetected),
  });
  PREFLIGHT_CONTEXT.set(preflight, {
    command: {
      executable: commandForDatabaseAction(options, url)[0]!,
      args: commandForDatabaseAction(options, url).slice(1),
      cwd: rawPackageDirectory,
      env,
    },
  });
  return preflight;
}

function defaultTargetResolver(options: DatabaseCommandOptions): DatabaseTargetResolution {
  const env = resolveDatabaseCommandEnv(options);
  const selectedUrl = databaseUrlForProfile(options.profile, env);
  const productionUrl = databaseUrlForProfile(
    options.profile,
    loadModeEnv(options.workspaceRoot, "prod", options.profile),
  );
  if (!selectedUrl || !productionUrl) {
    throw new Error("Selected or production database target is unavailable.");
  }
  return { selectedUrl, productionUrl, env };
}

export async function executeGuardedDatabasePush(
  preflight: DatabasePushPreflight,
  approvalLookup: ProtectedApprovalLookup | null,
  runPush: DatabasePushCommandRunner = defaultPushRunner,
) {
  const context = PREFLIGHT_CONTEXT.get(preflight);
  if (!context) throw new Error("Database push needs a genuine current preflight.");
  if (EXECUTED_PREFLIGHTS.has(preflight)) {
    throw new Error("Database push preflight has already been used.");
  }
  if (preflight.risk === "destructive") {
    throw new Error("Destructive Prisma diff is blocked by the default DB-push policy.");
  }
  if (preflight.environment === "production") {
    if (!approvalLookup) {
      throw new Error("Production DB push needs protected approval and backup proof.");
    }
    let approval: ProtectedDatabaseApproval | null;
    try {
      approval = await approvalLookup(preflight);
    } catch {
      approval = null;
    }
    if (!approval || approval.provider !== "github-actions" ||
        approval.project !== preflight.project ||
        approval.targetId !== preflight.targetId ||
        approval.environment !== "production" ||
        approval.revision !== preflight.revision ||
        approval.targetFingerprint !== preflight.targetFingerprint ||
        approval.schemaFingerprint !== preflight.schemaFingerprint ||
        approval.sqlFingerprint !== preflight.sqlFingerprint ||
        approval.protectedEnvironment !== true ||
        approval.backupReady !== true ||
        typeof approval.approvalId !== "string" || !approval.approvalId) {
      throw new Error("Protected Production DB-push approval is missing or mismatched.");
    }
  }
  let exitCode: number;
  EXECUTED_PREFLIGHTS.add(preflight);
  try {
    exitCode = await runPush(context.command);
  } catch {
    throw new Error("Guarded DB push failed without a success receipt.");
  }
  if (exitCode !== 0) {
    throw new Error("Guarded DB push failed without a success receipt.");
  }
  return {
    project: preflight.project,
    targetId: preflight.targetId,
    environment: preflight.environment,
    revision: preflight.revision,
    schemaFingerprint: preflight.schemaFingerprint,
    targetFingerprint: preflight.targetFingerprint,
  };
}

async function defaultDiffRunner(command: DatabaseDiffCommand) {
  const result = spawnSync(command.executable, command.args, {
    cwd: command.cwd, env: command.env, encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"], maxBuffer: 2 * 1024 * 1024,
  });
  return { exitCode: result.status ?? 1, stdout: result.stdout ?? "" };
}

async function defaultPushRunner(command: DatabaseDiffCommand) {
  const result = spawnSync(command.executable, command.args, {
    cwd: command.cwd, env: command.env, encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"], maxBuffer: 2 * 1024 * 1024,
  });
  return result.status ?? 1;
}
