import type { NewSalesFormSeed } from "../contracts/new-sales-form-seed";
import { readSalesFormObjectMetadata } from "./metadata";

export const SALES_REQUEST_INTERPRETATIONS_META_KEY =
	"salesRequestInterpretations";

export type SalesRequestInterpretation = NonNullable<
	NewSalesFormSeed["interpretations"]
>[number];

type SalesRequestInterpretationLine = {
	meta?: unknown;
	formSteps?: Array<{
		stepId?: number | null;
		prodUid?: string | null;
		meta?: unknown;
	}> | null;
};

function isSalesRequestInterpretation(
	value: unknown,
): value is SalesRequestInterpretation {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const entry = value as Record<string, unknown>;
	return (
		typeof entry.lineUid === "string" &&
		Number.isSafeInteger(entry.stepId) &&
		typeof entry.field === "string" &&
		typeof entry.sourceText === "string" &&
		typeof entry.selectedProdUid === "string" &&
		typeof entry.selectedTitle === "string" &&
		typeof entry.reason === "string"
	);
}

export function readSalesRequestInterpretations(
	meta: unknown,
): SalesRequestInterpretation[] {
	const entries =
		readSalesFormObjectMetadata(meta)?.[SALES_REQUEST_INTERPRETATIONS_META_KEY];
	return Array.isArray(entries)
		? entries.filter(isSalesRequestInterpretation)
		: [];
}

function selectedProdUidsForStep(
	line: SalesRequestInterpretationLine,
	stepId: number,
) {
	const step = (line.formSteps || []).find(
		(candidate) => Number(candidate.stepId) === stepId,
	);
	if (!step) return [];
	const stepMeta = readSalesFormObjectMetadata(step.meta);
	const selectedProdUids = Array.isArray(stepMeta?.selectedProdUids)
		? stepMeta.selectedProdUids
				.map((uid) => String(uid || "").trim())
				.filter(Boolean)
		: [];
	const scalarUid = String(step.prodUid || "").trim();
	return [...new Set([...selectedProdUids, ...(scalarUid ? [scalarUid] : [])])];
}

export function getActiveSalesRequestInterpretations(
	line: SalesRequestInterpretationLine,
) {
	return readSalesRequestInterpretations(line.meta).filter((entry) =>
		selectedProdUidsForStep(line, entry.stepId).includes(entry.selectedProdUid),
	);
}

export function removeSalesRequestInterpretationFromMeta(
	meta: unknown,
	target: SalesRequestInterpretation,
) {
	const currentMeta = readSalesFormObjectMetadata(meta) || {};
	return {
		...currentMeta,
		[SALES_REQUEST_INTERPRETATIONS_META_KEY]: readSalesRequestInterpretations(
			currentMeta,
		).filter(
			(entry) =>
				entry.lineUid !== target.lineUid ||
				entry.stepId !== target.stepId ||
				entry.field !== target.field ||
				entry.sourceText !== target.sourceText ||
				entry.selectedProdUid !== target.selectedProdUid,
		),
	};
}

export function reconcileSalesRequestInterpretations<
	TLine extends SalesRequestInterpretationLine,
>(line: TLine, patch: Partial<TLine>): Partial<TLine> {
	if (!("formSteps" in patch)) return patch;
	const currentMeta = readSalesFormObjectMetadata(line.meta) || {};
	const patchMeta = readSalesFormObjectMetadata(patch.meta) || {};
	if (!readSalesRequestInterpretations(currentMeta).length) return patch;

	const nextLine = {
		...line,
		...patch,
		meta: { ...currentMeta, ...patchMeta },
	};
	return {
		...patch,
		meta: {
			...currentMeta,
			...patchMeta,
			[SALES_REQUEST_INTERPRETATIONS_META_KEY]:
				getActiveSalesRequestInterpretations(nextLine),
		},
	};
}
