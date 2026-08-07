"use client";

import type { SalesFormLineItemRecord } from "../../application";
import {
  isMouldingItem,
  isServiceItem,
  isShelfItem,
  normalizeSalesFormTitle as normalizeTitle,
} from "../../domain";

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
  options?: {
    retainMouldingComponentGrid?: boolean;
  },
) {
  const title = normalizeTitle(activeStep?.step?.title);
  const itemType = normalizeTitle(
    (line?.formSteps || []).find(
      (step) => normalizeTitle(step?.step?.title) === "item type",
    )?.value,
  );
  const hasMouldingRows = hasPersistedGroupedRows(line, "mouldingRows");
  const hasServiceRows = hasPersistedGroupedRows(line, "serviceRows");
  const mouldingRowsMatchType =
    hasMouldingRows && (!itemType || isMouldingItem(line));
  const serviceRowsMatchType =
    hasServiceRows && (!itemType || isServiceItem(line));
  if (options?.retainMouldingComponentGrid && title === "moulding") {
    return "component-grid";
  }
  if (
    mouldingRowsMatchType ||
    (isMouldingItem(line) && title.includes("line item"))
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

export function shouldRenderWorkflowStepPanel(input: {
  isActive: boolean;
  isHousePackageToolStep: boolean;
  stepFamily: ReturnType<typeof getItemWorkflowStepFamily>;
}) {
  return (
    input.isActive ||
    input.isHousePackageToolStep ||
    input.stepFamily !== "component-grid"
  );
}
