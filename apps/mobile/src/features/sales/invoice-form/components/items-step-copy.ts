export function normalizeInvoiceItemDescription(value?: string | null) {
  const description = String(value || "");
  return isHiddenWorkflowDescription(description) ? "" : description;
}

function isHiddenWorkflowDescription(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === "wf-item") return true;
  if (normalized.startsWith("workflow-")) return true;
  if (normalized.startsWith("mobile-")) return true;
  if (normalized.includes("componentuid") || normalized.includes("sourceuid")) {
    return true;
  }
  return /(^|[-_])(uid|uuid)([-_]|$)/.test(normalized);
}
