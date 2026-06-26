import { formatMoney } from "../lib/format";
import type { InvoiceItemSection } from "./items-step-sections";

export type InvoiceItemSheetMode = "list" | "edit" | "delete";

export function getInvoiceItemSheetIndexLabel(index: number) {
	return `Item ${String(index + 1).padStart(2, "0")}`;
}

export function getInvoiceItemEditTitleLabel(index: number) {
	return `Edit Item ${index + 1} Title`;
}

export function getInvoiceItemSheetSummary(section: InvoiceItemSection) {
	const lineCount = section.lines.length;
	const lineLabel = lineCount === 1 ? "line" : "lines";
	const qty = Number(section.qty || 0);
	const qtyLabel = qty > 0 ? `Qty ${qty}` : null;
	return [qtyLabel, `${lineCount} ${lineLabel}`, formatMoney(section.total)]
		.filter(Boolean)
		.join(" • ");
}

export function getInvoiceItemEditableLineUid(
	section: InvoiceItemSection | null | undefined,
) {
	return section?.lines[0]?.uid || null;
}

export function getInvoiceItemDeleteLineUids(
	section: InvoiceItemSection | null | undefined,
) {
	return section?.lines.map((line) => line.uid).filter(Boolean) || [];
}

export function getNextInvoiceItemActiveIndex({
	currentIndex,
	removedIndex,
	itemCount,
}: {
	currentIndex: number;
	removedIndex: number;
	itemCount: number;
}) {
	if (itemCount <= 1) return 0;
	if (currentIndex > removedIndex) return Math.max(0, currentIndex - 1);
	if (currentIndex === removedIndex) {
		return Math.min(removedIndex, itemCount - 2);
	}
	return Math.min(currentIndex, itemCount - 2);
}
