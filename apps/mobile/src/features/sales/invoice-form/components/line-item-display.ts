import { readSalesFormObjectMetadata } from "@gnd/sales/sales-form-core";
import type { NewSalesFormLineItem } from "../types";

export function getLineItemCardSubtitle(item: NewSalesFormLineItem) {
  const meta = readLineItemMeta(item);
  const rawSku = normalizeDisplayValue(meta.sku);
  if (!isWorkflowLineItem(item)) return rawSku || normalizeDisplayValue(item.description) || "ITEM";

  const identityValues = [
    meta.workflowComponentUid,
    meta.sourceUid,
    item.uid,
  ].map(normalizeIdentityValue);
  if (rawSku && isSafeWorkflowSubtitle(rawSku, identityValues)) {
    return rawSku;
  }

  const fallback = [
    meta.category,
    item.description,
    item.title,
  ]
    .map(normalizeDisplayValue)
    .find((value) => isSafeWorkflowSubtitle(value, identityValues));
  return fallback || "Workflow item";
}

export function getLineItemDisplayTitle(item: NewSalesFormLineItem) {
  if (!isWorkflowLineItem(item)) {
    return normalizeDisplayValue(item.title) || "Item";
  }

  const meta = readLineItemMeta(item);
  const identityValues = [
    meta.workflowComponentUid,
    meta.sourceUid,
    item.uid,
  ].map(normalizeIdentityValue);
  const fallback = [
    item.title,
    item.description,
    meta.category,
  ]
    .map(normalizeDisplayValue)
    .find((value) => isSafeWorkflowSubtitle(value, identityValues));
  return fallback || "Workflow item";
}

function isWorkflowLineItem(item: NewSalesFormLineItem) {
  const meta = readLineItemMeta(item);
  return (
    Array.isArray(item.formSteps) && item.formSteps.length > 0 ||
    Boolean(meta.workflowComponentUid)
  );
}

function readLineItemMeta(item: NewSalesFormLineItem) {
  return readSalesFormObjectMetadata(item.meta) || {};
}

function normalizeDisplayValue(value: unknown) {
  return String(value || "").trim();
}

function normalizeIdentityValue(value: unknown) {
  return normalizeDisplayValue(value).toLowerCase();
}

function isSafeWorkflowSubtitle(value: string, identityValues: string[]) {
  const normalized = normalizeIdentityValue(value);
  if (!normalized) return false;
  if (identityValues.includes(normalized)) return false;
  return !isLikelyUidCopy(normalized);
}

function isLikelyUidCopy(normalized: string) {
  if (normalized.startsWith("workflow-")) return true;
  if (normalized.includes("componentuid") || normalized.includes("sourceuid")) return true;
  return /(^|[-_])(uid|uuid)([-_]|$)/.test(normalized);
}
