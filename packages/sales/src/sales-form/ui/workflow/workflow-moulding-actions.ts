import {
	applyMultiSelectStepMutation,
	compactStepValue,
	deriveMouldingRows,
	getSelectedProdUids,
	normalizeSalesFormTitle as normalizeTitle,
	readSalesFormObjectMetadata,
	sharedMouldingComponentPrice,
	summarizeMouldingPersistRows,
} from "../../domain";
import { snapshotSelectedComponent } from "./component-utils";
import {
	getWorkflowSteps,
	type MouldingRow,
	type WorkflowComponentRecord,
	type WorkflowLineItemRecord,
	type WorkflowStepRecord,
} from "./workflow-records";

export type WorkflowMouldingRemovalPatch = {
	meta: Record<string, unknown>;
	qty: number;
	lineTotal: number;
	unitPrice: number;
	formSteps?: WorkflowStepRecord[];
};

export type WorkflowMouldingSelectionPatch = {
	formSteps: WorkflowStepRecord[];
	meta: Record<string, unknown>;
	qty: number;
	lineTotal: number;
	unitPrice: number;
};

function getMouldingRows(line: WorkflowLineItemRecord): MouldingRow[] {
	const meta = readSalesFormObjectMetadata(line.meta) || {};
	return Array.isArray(meta?.mouldingRows) ? meta.mouldingRows : [];
}

function stepMetadataRecords(step: WorkflowStepRecord) {
	return [
		readSalesFormObjectMetadata(step?.meta),
		readSalesFormObjectMetadata(readSalesFormObjectMetadata(step?.step)?.meta),
	].filter(Boolean) as Record<string, unknown>[];
}

function readSelectedMouldingUids(step: WorkflowStepRecord) {
	const metaUids = stepMetadataRecords(step)
		.flatMap((meta) =>
			Array.isArray(meta.selectedProdUids) ? meta.selectedProdUids : [],
		)
		.map((uid) => String(uid || "").trim())
		.filter(Boolean);
	const fallbackUids = getSelectedProdUids(step);
	return Array.from(new Set([...metaUids, ...fallbackUids]));
}

function readSelectedMouldingComponents(
	step: WorkflowStepRecord,
	fallback: WorkflowComponentRecord[],
) {
	const metaComponents = stepMetadataRecords(step).flatMap((meta) =>
		Array.isArray(meta.selectedComponents) ? meta.selectedComponents : [],
	);
	const byUid = new Map<string, WorkflowComponentRecord>();
	for (const component of [...fallback, ...metaComponents]) {
		const record = readSalesFormObjectMetadata(component);
		const uid = String(record?.uid || "").trim();
		if (!uid || byUid.has(uid)) continue;
		byUid.set(uid, record as WorkflowComponentRecord);
	}
	return Array.from(byUid.values());
}

export function saveWorkflowMouldingSelectionWithQty(input: {
	line: WorkflowLineItemRecord;
	steps: WorkflowStepRecord[];
	stepIndex: number;
	component: WorkflowComponentRecord;
	visibleComponents: WorkflowComponentRecord[];
	qty: number | string;
	activeStepTitle?: string | null;
}): WorkflowMouldingSelectionPatch | null {
	const step = input.steps[input.stepIndex];
	if (!step) return null;
	const nextQty = Math.max(1, Number(input.qty || 0) || 1);
	const multiMutation = applyMultiSelectStepMutation({
		steps: [...input.steps],
		currentStepIndex: input.stepIndex,
		component: input.component,
		visibleComponents: input.visibleComponents,
		selectedOverride: true,
		activeStepTitle: input.activeStepTitle || "",
	});
	const selectedComponents = Array.isArray(
		multiMutation.steps[input.stepIndex]?.meta?.selectedComponents,
	)
		? (multiMutation.steps[input.stepIndex].meta
				.selectedComponents as WorkflowComponentRecord[])
		: [];
	const sharedComponentPrice = sharedMouldingComponentPrice(
		multiMutation.steps || [],
	);
	const derivedRows = deriveMouldingRows({
		selectedMouldings: selectedComponents,
		existingRows: getMouldingRows(input.line),
		sharedComponentPrice,
	}).map((row) =>
		String(row?.uid || "") === String(input.component?.uid || "")
			? {
					...row,
					qty: nextQty,
				}
			: row,
	);
	const summary = summarizeMouldingPersistRows(
		derivedRows,
		sharedComponentPrice,
	);
	return {
		formSteps: multiMutation.steps,
		meta: {
			...(readSalesFormObjectMetadata(input.line.meta) || {}),
			mouldingRows: summary.storedRows,
		},
		qty: summary.qtyTotal,
		lineTotal: summary.total,
		unitPrice: summary.unitPrice,
	};
}

export function removeWorkflowMouldingSelection(input: {
	line: WorkflowLineItemRecord;
	mouldingUid: string;
	rows: MouldingRow[];
	selectedMouldings: WorkflowComponentRecord[];
	sharedComponentPrice?: number | null;
}): WorkflowMouldingRemovalPatch | null {
	if (input.rows.length <= 1) {
		return null;
	}
	const remainingRows = input.rows.filter(
		(row) => String(row.uid) !== input.mouldingUid,
	);
	if (!remainingRows.length) return null;
	const next = summarizeMouldingPersistRows(
		remainingRows,
		input.sharedComponentPrice || 0,
	);
	const patch: WorkflowMouldingRemovalPatch = {
		meta: {
			...(readSalesFormObjectMetadata(input.line.meta) || {}),
			mouldingRows: next.storedRows,
		},
		qty: next.qtyTotal,
		lineTotal: next.total,
		unitPrice: next.unitPrice,
	};

	const steps = [...getWorkflowSteps(input.line)];
	const mouldingStepIndex = steps.findIndex(
		(step) => normalizeTitle(step?.step?.title) === "moulding",
	);
	if (mouldingStepIndex < 0) return patch;

	const mouldingStep = steps[mouldingStepIndex];
	const selectedUids = readSelectedMouldingUids(mouldingStep).filter(
		(uid) => uid !== input.mouldingUid,
	);
	const selectedComponentsSource = readSelectedMouldingComponents(
		mouldingStep,
		input.selectedMouldings,
	);
	const remainingComponents = selectedUids
		.map(
			(uid) =>
				input.selectedMouldings.find(
					(component) => String(component.uid) === uid,
				) ||
				selectedComponentsSource.find(
					(component) => String(component?.uid) === uid,
				),
		)
		.filter(Boolean) as WorkflowComponentRecord[];
	const primary = remainingComponents[0] || null;
	const totalSales = remainingComponents.reduce(
		(sum, component) => sum + Number(component?.salesPrice || 0),
		0,
	);
	const totalBase = remainingComponents.reduce(
		(sum, component) => sum + Number(component?.basePrice || 0),
		0,
	);
	steps[mouldingStepIndex] = {
		...mouldingStep,
		componentId: primary?.id || null,
		prodUid: primary?.uid || "",
		value: compactStepValue(remainingComponents),
		price: remainingComponents.length ? totalSales : 0,
		basePrice: remainingComponents.length ? totalBase : 0,
		meta: {
			...(readSalesFormObjectMetadata(mouldingStep?.meta) || {}),
			selectedProdUids: selectedUids.map((uid) => String(uid)),
			selectedComponents: remainingComponents.map((component) =>
				snapshotSelectedComponent(component),
			),
		},
	};
	patch.formSteps = steps;
	return patch;
}
