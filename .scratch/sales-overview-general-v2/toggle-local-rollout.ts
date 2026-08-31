#!/usr/bin/env bun

import { db } from "../../packages/db/src/index";
import {
  normalizeSalesOverviewViewSettings,
  type SalesOverviewViewSettings,
} from "../../packages/settings/src/schema";

const mode = process.argv[2] || "read";
const databaseUrl = new URL(process.env.DATABASE_URL || "");
if (
  !["127.0.0.1", "localhost"].includes(databaseUrl.hostname) ||
  databaseUrl.port !== "3307"
) {
  throw new Error("This QA helper only runs against local MySQL on port 3307.");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const setting = await db.settings.findFirst({
  where: { type: "sales-settings", deletedAt: null },
  select: { id: true, meta: true },
});
const currentMeta = asRecord(setting?.meta);
const hasRolloutPolicy = Object.hasOwn(currentMeta, "salesOverviewView");
const currentPolicy = hasRolloutPolicy
  ? normalizeSalesOverviewViewSettings(currentMeta.salesOverviewView)
  : null;

async function persist(meta: Record<string, unknown>) {
  if (setting) {
    await db.settings.update({
      where: { id: setting.id },
      data: { meta },
    });
    return;
  }
  await db.settings.create({
    data: { type: "sales-settings", meta },
  });
}

try {
  switch (mode) {
    case "read":
      break;
    case "set-office-v2":
      await persist({
        ...currentMeta,
        salesOverviewView: {
          officeDefault: "v2",
          superAdminPreview: "inherit",
        } satisfies SalesOverviewViewSettings,
      });

      break;
    case "restore-missing": {
      const { salesOverviewView: _rollout, ...restoredMeta } = currentMeta;
      await persist(restoredMeta);

      break;
    }
    case "restore": {
      const value = process.argv[3];
      if (!value) throw new Error("Restore requires a JSON policy argument.");
      await persist({
        ...currentMeta,
        salesOverviewView: normalizeSalesOverviewViewSettings(
          JSON.parse(value),
        ),
      });
      break;
    }
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
} finally {
  await db.$disconnect();
}
