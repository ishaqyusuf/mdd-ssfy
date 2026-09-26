import { existsSync, readFileSync } from "node:fs";
import type { ReleaseEnvironment } from "./plan";

export type ReleaseBaselineClaims = {
  version: 1;
  project: string;
  baselines: Partial<
    Record<ReleaseEnvironment, Record<string, string | null>>
  >;
};

/**
 * Baseline claims are advisory inputs for local planning, not deployment proof.
 * Ticket 4 will replace CI trust with provider-verifiable evidence.
 */
export function readBaselineClaims(
  path: string,
  project: string,
  environment: ReleaseEnvironment,
  explicitPath: boolean,
): { baselines: Record<string, string | null>; present: boolean } {
  if (!existsSync(path)) {
    if (explicitPath) throw new Error(`Baseline claims file not found: ${path}`);
    return { baselines: {}, present: false };
  }
  let parsed: ReleaseBaselineClaims;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`Invalid baseline claims JSON: ${path}`);
  }
  if (
    !parsed ||
    parsed.version !== 1 ||
    parsed.project !== project ||
    !parsed.baselines ||
    typeof parsed.baselines !== "object" ||
    Array.isArray(parsed.baselines)
  ) {
    throw new Error("Baseline claims version or project does not match the manifest.");
  }
  const selected = parsed.baselines[environment] ?? {};
  if (!selected || typeof selected !== "object" || Array.isArray(selected)) {
    throw new Error(`Invalid ${environment} baseline claims.`);
  }
  const baselines: Record<string, string | null> = {};
  for (const [id, revision] of Object.entries(selected)) {
    if (revision !== null && typeof revision !== "string") {
      throw new Error(`Invalid baseline revision for ${id}.`);
    }
    baselines[id] = revision;
  }
  return { baselines, present: true };
}
