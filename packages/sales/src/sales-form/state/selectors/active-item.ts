import type { SalesFormStateRecord } from "../types";
import { resolveInitialWorkflowStepIndex } from "../../domain";

export function getFirstSalesFormLineItemUid(
	record: SalesFormStateRecord | null,
) {
	return record?.lineItems?.[0]?.uid || null;
}

export function getNextSalesFormActiveItem(
	record: SalesFormStateRecord,
	removedUid: string,
	currentActiveItem: string | null,
) {
	if (currentActiveItem !== removedUid) return currentActiveItem;
	return record.lineItems.find((line) => line.uid !== removedUid)?.uid || null;
}

export function getInitialSalesFormActiveStepByLine(
	record: SalesFormStateRecord | null,
) {
	const activeStepByLine: Record<string, number> = {};
	for (const line of record?.lineItems || []) {
		const uid = String(line?.uid || "").trim();
		if (!uid) continue;
		activeStepByLine[uid] = resolveInitialWorkflowStepIndex(
			Array.isArray(line.formSteps) ? line.formSteps : [],
		);
	}
	return activeStepByLine;
}
