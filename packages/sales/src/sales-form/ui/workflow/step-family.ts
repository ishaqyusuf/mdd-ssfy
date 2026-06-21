"use client";

import {
  isMouldingItem,
  isServiceItem,
  isShelfItem,
  normalizeSalesFormTitle as normalizeTitle,
} from "../../domain";
import type { SalesFormLineItemRecord } from "../../application";

type WorkflowStep = NonNullable<SalesFormLineItemRecord["formSteps"]>[number];

function hasPersistedGroupedRows(
  line: SalesFormLineItemRecord,
  key: "mouldingRows" | "serviceRows",
) {
  const meta = line.meta as SalesFormLineItemRecord["meta"] & {
    mouldingRows?: unknown[];
    serviceRows?: unknown[];
  };
  const rows = meta?.[key];
  return Array.isArray(rows) && rows.length > 0;
}

export function getItemWorkflowStepFamily(
  line: SalesFormLineItemRecord,
  activeStep?: WorkflowStep | null,
) {
  const title = normalizeTitle(activeStep?.step?.title);
  const itemType = normalizeTitle(
    (line?.formSteps || []).find(
      (step: any) => normalizeTitle(step?.step?.title) === "item type",
    )?.value,
  );
  const hasMouldingRows = hasPersistedGroupedRows(line, "mouldingRows");
  const hasServiceRows = hasPersistedGroupedRows(line, "serviceRows");
  const mouldingRowsMatchType =
    hasMouldingRows && (!itemType || isMouldingItem(line));
  const serviceRowsMatchType =
    hasServiceRows && (!itemType || isServiceItem(line));
  if (
    mouldingRowsMatchType ||
    (isMouldingItem(line) &&
      (title.includes("line item") ||
        title === "moulding" ||
        title === "item type"))
  ) {
    return "moulding-line-item";
  }
  if (
    serviceRowsMatchType ||
    (isServiceItem(line) &&
      (title.includes("line item") ||
        title === "services" ||
        title === "service" ||
        title === "item type"))
  ) {
    return "service-line-item";
  }
  if (
    (isShelfItem(line) || title.includes("shelf")) &&
    title.includes("shelf")
  ) {
    return "shelf";
  }
  return "component-grid";
}
