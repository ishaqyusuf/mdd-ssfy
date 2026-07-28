import { storage } from "@/store/mmkv";
import type {
  NewSalesFormSettings,
  NewSalesFormType,
  SaveDraftNewSalesFormPayload,
} from "../types";

const RECOVERY_VERSION = 1;
const RECOVERY_PREFIX = "new-sales-form:recovery";

export type InvoiceFormRecoverySnapshot = {
  version: number;
  savedAt: string;
  payload: SaveDraftNewSalesFormPayload;
  settings?: NewSalesFormSettings | null;
};

export function getInvoiceFormRecoveryKey(source: {
  type: NewSalesFormType;
  slug?: string | null;
  salesId?: string | number | null;
}) {
  const scope = String(source.slug || source.salesId || "draft").trim() || "draft";
  return `${RECOVERY_PREFIX}:${source.type}:${scope}`;
}

export function createInvoiceFormRecoverySnapshot(
  payload: SaveDraftNewSalesFormPayload,
  settings?: NewSalesFormSettings | null,
  savedAt = new Date().toISOString(),
): InvoiceFormRecoverySnapshot {
  return {
    version: RECOVERY_VERSION,
    savedAt,
    payload,
    settings,
  };
}

export function parseInvoiceFormRecoverySnapshot(raw?: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as InvoiceFormRecoverySnapshot;
    if (
      !parsed ||
      parsed.version !== RECOVERY_VERSION ||
      !parsed.savedAt ||
      !parsed.payload
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createInvoiceFormPayloadFingerprint(
  payload?: SaveDraftNewSalesFormPayload | null,
) {
  if (!payload) return "";
  return JSON.stringify({
    meta: payload.meta,
    lineItems: payload.lineItems,
    extraCosts: payload.extraCosts,
    summary: payload.summary,
    type: payload.type,
  });
}

export function isInvoiceFormRecoverySnapshotNewer(
  snapshot: InvoiceFormRecoverySnapshot,
  recordUpdatedAt?: string | null,
) {
  if (!recordUpdatedAt) return true;
  const snapshotTime = new Date(snapshot.savedAt).getTime();
  const recordTime = new Date(recordUpdatedAt).getTime();
  if (!Number.isFinite(snapshotTime)) return false;
  if (!Number.isFinite(recordTime)) {
    return true;
  }
  return snapshotTime > recordTime;
}

export async function readInvoiceFormRecoverySnapshot(key: string) {
  return parseInvoiceFormRecoverySnapshot(await storage.getString(key));
}

export async function writeInvoiceFormRecoverySnapshot(
  key: string,
  payload: SaveDraftNewSalesFormPayload,
  settings?: NewSalesFormSettings | null,
) {
  const snapshot = createInvoiceFormRecoverySnapshot(payload, settings);
  await storage.set(key, JSON.stringify(snapshot));
}

export async function clearInvoiceFormRecoverySnapshot(key: string) {
  await storage.remove(key);
}
