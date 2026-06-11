import {
	applyMultiSelectStepMutation,
	compactStepValue,
	deriveMouldingRows,
	getSelectedProdUids,
	normalizeSalesFormTitle as normalizeTitle,
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
	const meta = line.meta as WorkflowLineItemRecord["meta"] & {
		mouldingRows?: MouldingRow[];
	};
	return Array.isArray(meta?.mouldingRows) ? meta.mouldingRows : [];
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
			...(input.line.meta || {}),
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
}): WorkflowMouldingRemovalPatch {
	const remainingRows = input.rows.filter(
		(row) => String(row.uid) !== input.mouldingUid,
	);
	const next = summarizeMouldingPersistRows(
		remainingRows,
		input.sharedComponentPrice || 0,
	);
	const patch: WorkflowMouldingRemovalPatch = {
		meta: {
			...(input.line.meta || {}),
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
	const selectedUids = getSelectedProdUids(mouldingStep).filter(
		(uid) => uid !== input.mouldingUid,
	);
	const selectedComponentsSource = Array.isArray(
		mouldingStep?.meta?.selectedComponents,
	)
		? mouldingStep.meta.selectedComponents
		: input.selectedMouldings;
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
			...(mouldingStep?.meta || {}),
			selectedProdUids: selectedUids.map((uid) => String(uid)),
			selectedComponents: remainingComponents.map((component) =>
				snapshotSelectedComponent(component),
			),
		},
	};
	patch.formSteps = steps;
	return patch;
}
