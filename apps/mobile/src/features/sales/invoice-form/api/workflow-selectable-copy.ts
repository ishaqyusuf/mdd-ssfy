import type { WorkflowComponentRecord } from "@gnd/sales/sales-form-core";

export function getWorkflowSelectableTitle(component: WorkflowComponentRecord) {
  const title = [component.title, component.value]
    .map(normalizeDisplayValue)
    .find((value) => value && !isLikelyUidCopy(value));
  return title || "Component";
}

export function getWorkflowSelectableSku(component: WorkflowComponentRecord) {
  const title = getWorkflowSelectableTitle(component);
  return title === "Component" ? "Workflow component" : title;
}

export function formatWorkflowComponentLabel(value?: string | null) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeDisplayValue(value: unknown) {
  return String(value || "").trim();
}

function isLikelyUidCopy(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("workflow-")) return true;
  if (normalized.includes("componentuid") || normalized.includes("sourceuid")) {
    return true;
  }
  return /(^|[-_])(uid|uuid)([-_]|$)/.test(normalized);
}
