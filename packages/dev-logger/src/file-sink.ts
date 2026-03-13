// @ts-nocheck
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DevLogEntry } from "./index.js";

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

function isWorkspaceRoot(dir: string) {
  try {
    const packageJsonPath = path.join(dir, "package.json");
    if (!existsSync(packageJsonPath)) return false;
    const raw = readFileSync(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { workspaces?: unknown };
    return Array.isArray(parsed.workspaces);
  } catch {
    return false;
  }
}

export function findWorkspaceRoot(start = process.cwd()) {
  let current = start;
  for (let i = 0; i < 8; i++) {
    if (isWorkspaceRoot(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return start;
}

export async function appendDevLogEntryToFile(
  entry: DevLogEntry,
  opts?: {
    filePath?: string;
  },
) {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const filePath = opts?.filePath || path.join(workspaceRoot, "logger.json");
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });

  let existingRaw = "{}";
  if (existsSync(filePath)) {
    existingRaw = await readFile(filePath, "utf8");
  }

  let parsed: Record<string, unknown> = {};
  try {
    const maybe = JSON.parse(existingRaw);
    if (maybe && typeof maybe === "object" && !Array.isArray(maybe)) {
      parsed = maybe as Record<string, unknown>;
    }
  } catch {
    const backupPath = `${filePath}.corrupt-${Date.now()}-${randomSuffix()}.bak`;
    await writeFile(backupPath, existingRaw, "utf8");
    parsed = {};
  }

  const key = entry.logId || `log-${Date.now()}-${randomSuffix()}`;
  parsed[key] = entry;
  const nextRaw = JSON.stringify(parsed, null, 2);
  const tmpPath = `${filePath}.tmp-${process.pid}-${randomSuffix()}`;
  await writeFile(tmpPath, nextRaw, "utf8");
  await rename(tmpPath, filePath);
}
