import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync,
  readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

export type VendorLock = {
  version: 1;
  toolkitRevision: string;
  snapshotPath: string;
  files: Record<string, string>;
};

const SHA = /^[0-9a-f]{40}$/i;
const HASH = /^[0-9a-f]{64}$/i;
const FIXED_FILES = new Set([
  "src/env.ts", "src/db-command.ts", "src/database-target.ts",
  "src/with-env.ts", "bin/release.ts", "bin/release-ci.ts",
  "action/action.yml", "package.json", "bun.lock", "tsconfig.json",
]);

function git(root: string, args: string[]) {
  return execFileSync("git", args, {
    cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function selectedFiles(toolkitRoot: string, revision: string) {
  const files = git(toolkitRoot, ["ls-tree", "-r", "--name-only", revision])
    .split("\n")
    .filter((path) => path.startsWith("src/release/") || FIXED_FILES.has(path));
  if (!files.includes("bin/release-ci.ts") ||
      !files.includes("src/release/vendor.ts") ||
      [...FIXED_FILES].some((path) => !files.includes(path))) {
    throw new Error("Toolkit revision does not contain the release-only CI inventory.");
  }
  return files.sort();
}

function hash(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function safeRelativeFile(path: unknown) {
  return typeof path === "string" && path.length > 0 &&
    !path.startsWith("/") && !path.includes("\\") &&
    path.split("/").every((part) => part && part !== "." && part !== "..");
}

function snapshotFiles(root: string, directory = root): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Vendored toolkit must not contain symlinks.");
    if (entry.isDirectory()) found.push(...snapshotFiles(root, path));
    else if (entry.isFile()) found.push(relative(root, path).replaceAll("\\", "/"));
    else throw new Error("Vendored toolkit contains an unsupported file type.");
  }
  return found.sort();
}

function validateLock(lock: unknown): asserts lock is VendorLock {
  if (!lock || typeof lock !== "object") throw new Error("Invalid toolkit vendor lock.");
  const data = lock as Partial<VendorLock>;
  if (data.version !== 1 || typeof data.toolkitRevision !== "string" ||
      !SHA.test(data.toolkitRevision) ||
      data.snapshotPath !== `.release/toolkit/${data.toolkitRevision}` ||
      !data.files || typeof data.files !== "object" ||
      Array.isArray(data.files) || Object.keys(data.files).length === 0 ||
      Object.entries(data.files).some(([path, value]) =>
        !safeRelativeFile(path) || !HASH.test(value))) {
    throw new Error("Invalid toolkit vendor lock.");
  }
}

/** Verify all committed release-only files before consumer CI runs adapters. */
export function verifyVendorSnapshot(consumerRoot: string): VendorLock {
  const root = resolve(consumerRoot);
  const lockPath = join(root, ".release/toolkit.lock.json");
  let lock: unknown;
  try { lock = JSON.parse(readFileSync(lockPath, "utf8")); }
  catch { throw new Error("Toolkit vendor lock is missing or invalid."); }
  validateLock(lock);
  const snapshot = join(root, lock.snapshotPath);
  if (!existsSync(snapshot) || !lstatSync(snapshot).isDirectory()) {
    throw new Error("Pinned toolkit snapshot is missing.");
  }
  const actual = snapshotFiles(snapshot);
  const expected = Object.keys(lock.files).sort();
  if (actual.length !== expected.length ||
      actual.some((path, index) => path !== expected[index])) {
    throw new Error("Pinned toolkit file inventory changed.");
  }
  for (const path of expected) {
    if (hash(readFileSync(join(snapshot, path))) !== lock.files[path]) {
      throw new Error(`Pinned toolkit file changed: ${path}`);
    }
  }
  return lock;
}

/** Explicit consumer install; no sibling-directory dependency in its CI checkout. */
export function installVendorSnapshot(
  toolkitDirectory: string,
  consumerDirectory: string,
  revision: string,
  update = false,
): VendorLock {
  if (!SHA.test(revision)) throw new Error("Vendor install needs a full toolkit commit SHA.");
  const toolkitRoot = realpathSync(resolve(toolkitDirectory));
  const consumerRoot = realpathSync(resolve(consumerDirectory));
  if (toolkitRoot === consumerRoot ||
      git(toolkitRoot, ["rev-parse", "--show-toplevel"]) !== toolkitRoot ||
      git(consumerRoot, ["rev-parse", "--show-toplevel"]) !== consumerRoot ||
      git(toolkitRoot, ["rev-parse", `${revision}^{commit}`]) !== revision) {
    throw new Error("Vendor install needs distinct exact Git roots and a committed toolkit revision.");
  }
  const files = selectedFiles(toolkitRoot, revision);
  const releaseDirectory = join(consumerRoot, ".release");
  const toolkitDirectoryPath = join(releaseDirectory, "toolkit");
  const destination = join(toolkitDirectoryPath, revision);
  const lockPath = join(releaseDirectory, "toolkit.lock.json");
  if (existsSync(destination) || existsSync(lockPath) && !update) {
    throw new Error("Pinned toolkit already exists; use an explicit update for a new revision.");
  }
  mkdirSync(toolkitDirectoryPath, { recursive: true });
  const temporary = mkdtempSync(join(toolkitDirectoryPath, ".install-"));
  try {
    const archive = execFileSync("git", ["archive", "--format=tar", revision,
      "--", ...files], { cwd: toolkitRoot, maxBuffer: 16 * 1024 * 1024 });
    const extract = spawnSync("tar", ["-xf", "-", "-C", temporary], {
      input: archive, stdio: ["pipe", "ignore", "ignore"],
    });
    if (extract.status !== 0) throw new Error("Could not unpack committed toolkit files.");
    const unpacked = snapshotFiles(temporary);
    if (unpacked.length !== files.length ||
        unpacked.some((path, index) => path !== files[index])) {
      throw new Error("Toolkit archive inventory differs from committed release files.");
    }
    const checksums = Object.fromEntries(files.map((path) =>
      [path, hash(readFileSync(join(temporary, path)))]));
    const lock: VendorLock = {
      version: 1, toolkitRevision: revision,
      snapshotPath: `.release/toolkit/${revision}`, files: checksums,
    };
    renameSync(temporary, destination);
    const pointer = join(releaseDirectory, `.toolkit-lock-${basename(temporary)}.tmp`);
    try {
      writeFileSync(pointer, `${JSON.stringify(lock, null, 2)}\n`, { flag: "wx" });
      renameSync(pointer, lockPath);
    } catch {
      throw new Error("Could not write pinned toolkit lock; snapshot remains recoverable.");
    }
    verifyVendorSnapshot(consumerRoot);
    return lock;
  } finally {
    if (existsSync(temporary)) rmSync(temporary, { recursive: true });
  }
}
