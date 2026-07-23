import { addMoney, roundMoney } from "@gnd/sales/payment-system/money";
import { readSalesFormObjectMetadata } from "@gnd/sales/sales-form-core";
import type { NewSalesFormLineItem } from "../types";

export type InvoiceItemSection = {
	key: string;
	title: string;
	lines: NewSalesFormLineItem[];
	qty: number;
	total: number;
	hasWorkflow: boolean;
};

export function buildInvoiceItemSections(
	lineItems: NewSalesFormLineItem[],
	fallbackTitle: string,
): InvoiceItemSection[] {
	const sections = new Map<string, InvoiceItemSection>();

	for (const line of lineItems) {
		const key = getInvoiceItemSectionKey(line);
		const existing = sections.get(key);
		if (existing) {
			existing.lines.push(line);
			existing.qty += Number(line.qty || 0);
			existing.total = addMoney(existing.total, line.lineTotal);
			continue;
		}
		sections.set(key, {
			key,
			title: getInvoiceItemSectionTitle(line, fallbackTitle),
			lines: [line],
			qty: Number(line.qty || 0),
			total: Number(line.lineTotal || 0),
			hasWorkflow: isWorkflowSectionLine(line),
		});
	}

	return Array.from(sections.values())
		.map((section) => ({
			...section,
			hasWorkflow:
				section.hasWorkflow ||
				section.lines.some((line) => isWorkflowSectionLine(line)),
			total: roundMoney(section.total),
		}))
		.sort((a, b) => Number(b.hasWorkflow) - Number(a.hasWorkflow));
}

export function isWorkflowSectionLine(line: NewSalesFormLineItem) {
	const meta = getInvoiceLineMeta(line);
	return (
		Boolean(meta.workflowComponentUid) ||
		(Array.isArray(line.formSteps) && line.formSteps.length > 0)
	);
}

function getInvoiceItemSectionKey(line: NewSalesFormLineItem) {
	if (isWorkflowSectionLine(line)) return `workflow:${line.uid}`;
	const meta = getInvoiceLineMeta(line);
	const sourceUid = String(meta.sourceUid || "").trim();
	return sourceUid ? `source:${sourceUid}` : `line:${line.uid}`;
}

function getInvoiceItemSectionTitle(
	line: NewSalesFormLineItem,
	fallbackTitle: string,
) {
	const meta = getInvoiceLineMeta(line);
	const category = String(meta.category || "").trim();
	if (category && !isWorkflowSectionLine(line)) return category;
	const description = String(line.description || "").trim();
	if (description) return description;
	if (isWorkflowSectionLine(line)) return "";
	return String(line.title || fallbackTitle);
}

function getInvoiceLineMeta(line: NewSalesFormLineItem) {
	return readSalesFormObjectMetadata(line.meta) || {};
}
