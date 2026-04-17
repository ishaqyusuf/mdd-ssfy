"use client";

import {
	isMouldingItem,
	isServiceItem,
	isShelfItem,
	normalizeSalesFormTitle as normalizeTitle,
} from "@gnd/sales/sales-form";

import type { NewSalesFormLineItem } from "../../schema";

type WorkflowStep = NonNullable<NewSalesFormLineItem["formSteps"]>[number];

export function getItemWorkflowStepFamily(
	line: NewSalesFormLineItem,
	activeStep?: WorkflowStep | null,
) {
	const title = normalizeTitle(activeStep?.step?.title);
	if (isMouldingItem(line) && title.includes("line item")) {
		return "moulding-line-item";
	}
	if (isServiceItem(line) && title.includes("line item")) {
		return "service-line-item";
	}
	if (isShelfItem(line) && title.includes("shelf")) {
		return "shelf";
	}
	return "component-grid";
}
