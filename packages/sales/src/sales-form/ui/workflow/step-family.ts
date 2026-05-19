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
	const hasMouldingRows = hasPersistedGroupedRows(line, "mouldingRows");
	const hasServiceRows = hasPersistedGroupedRows(line, "serviceRows");
	if (
		hasMouldingRows ||
		(isMouldingItem(line) &&
			(title.includes("line item") ||
				title === "moulding" ||
				title === "item type"))
	) {
		return "moulding-line-item";
	}
	if (
		hasServiceRows ||
		(isServiceItem(line) &&
			(title.includes("line item") ||
				title === "services" ||
				title === "service" ||
				title === "item type"))
	) {
		return "service-line-item";
	}
	if (isShelfItem(line) && title.includes("shelf")) {
		return "shelf";
	}
	return "component-grid";
}
