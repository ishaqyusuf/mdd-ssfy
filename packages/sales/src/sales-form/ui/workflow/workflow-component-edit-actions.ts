import {
	getWorkflowSteps,
	type WorkflowComponentRecord,
	type WorkflowLineItemRecord,
	type WorkflowStepRecord,
} from "./workflow-records";

export type WorkflowComponentEditMode = "edit" | "sectionOverride";

export type WorkflowComponentEditState = {
	open: boolean;
	mode: WorkflowComponentEditMode;
	lineUid: string | null;
	stepIndex: number;
	componentUid: string;
	componentTitle: string;
	componentImg: string;
	salesPrice: string;
	redirectUid: string;
	overrideMode: boolean;
	noHandle: boolean;
	hasSwing: boolean;
};

export type WorkflowComponentEditPatch = {
	formSteps: WorkflowStepRecord[];
};

export function buildWorkflowComponentEditState(input: {
	line: WorkflowLineItemRecord;
	stepIndex: number;
	component: WorkflowComponentRecord;
	mode?: WorkflowComponentEditMode;
}): WorkflowComponentEditState | null {
	const step = getWorkflowSteps(input.line)[input.stepIndex];
	if (!step) return null;
	const selected = Array.isArray(step?.meta?.selectedComponents)
		? step.meta.selectedComponents
		: [];
	const current = selected.find(
		(entry) => String(entry?.uid || "") === String(input.component?.uid || ""),
	);
	const sectionOverride =
		current?.sectionOverride || input.component?.sectionOverride || {};

	return {
		open: true,
		mode: input.mode || "edit",
		lineUid: input.line.uid || null,
		stepIndex: input.stepIndex,
		componentUid: String(input.component?.uid || ""),
		componentTitle: String(
			input.component?.title || input.component?.uid || "Component",
		),
		componentImg: String(current?.img || input.component?.img || ""),
		salesPrice: String(
			Number(current?.salesPrice ?? input.component?.salesPrice ?? 0) || 0,
		),
		redirectUid: String(
			current?.redirectUid ??
				input.component?.redirectUid ??
				(String(step?.prodUid || "") === String(input.component?.uid || "")
					? step?.meta?.redirectUid
					: "") ??
				"",
		),
		overrideMode: Boolean(sectionOverride?.overrideMode),
		noHandle: Boolean(sectionOverride?.noHandle),
		hasSwing:
			sectionOverride?.hasSwing == null
				? true
				: Boolean(sectionOverride?.hasSwing),
	};
}

export function saveWorkflowComponentEdit(input: {
	line: WorkflowLineItemRecord;
	state: WorkflowComponentEditState;
}): WorkflowComponentEditPatch | null {
	if (!input.state.lineUid || input.state.stepIndex < 0) return null;
	const steps = [...getWorkflowSteps(input.line)];
	const step = steps[input.state.stepIndex];
	if (!step) return null;

	const salesPrice = Number(input.state.salesPrice || 0);
	const selected = Array.isArray(step?.meta?.selectedComponents)
		? step.meta.selectedComponents
		: [];
	const hasTarget = selected.some(
		(entry) => String(entry?.uid || "") === String(input.state.componentUid),
	);
	const nextSelectedComponents = (
		hasTarget ? selected : [...selected, {} as WorkflowComponentRecord]
	).map((entry, index: number) => {
		const isPlaceholder = !hasTarget && index === selected.length;
		const uid = isPlaceholder
			? String(input.state.componentUid)
			: String(entry?.uid || "");
		if (uid !== String(input.state.componentUid)) return entry;
		return {
			...entry,
			uid: String(input.state.componentUid),
			title: entry?.title || input.state.componentTitle || "Component",
			img: input.state.componentImg || null,
			salesPrice,
			basePrice: entry?.basePrice == null ? salesPrice : Number(entry.basePrice),
			redirectUid: input.state.redirectUid || null,
			sectionOverride: {
				overrideMode: input.state.overrideMode,
				noHandle: input.state.noHandle,
				hasSwing: input.state.hasSwing,
			},
		};
	});

	const isCurrentSelected =
		String(step?.prodUid || "") === String(input.state.componentUid);
	steps[input.state.stepIndex] = {
		...step,
		price: isCurrentSelected ? salesPrice : step?.price,
		meta: {
			...(step?.meta || {}),
			img: isCurrentSelected
				? input.state.componentImg || null
				: step?.meta?.img || null,
			redirectUid: isCurrentSelected
				? input.state.redirectUid || null
				: step?.meta?.redirectUid || null,
			sectionOverride: isCurrentSelected
				? {
						overrideMode: input.state.overrideMode,
						noHandle: input.state.noHandle,
						hasSwing: input.state.hasSwing,
					}
				: step?.meta?.sectionOverride || null,
			selectedComponents: nextSelectedComponents,
		},
	};

	return {
		formSteps: steps,
	};
}

export function applyWorkflowComponentPriceOverride(input: {
	line: WorkflowLineItemRecord;
	stepIndex: number;
	component: WorkflowComponentRecord;
	price: number;
	fallbackBasePrice?: number | null;
}): WorkflowComponentEditPatch | null {
	if (!Number.isFinite(input.price) || input.price < 0) return null;
	const steps = [...getWorkflowSteps(input.line)];
	const step = steps[input.stepIndex];
	if (!step) return null;

	const selectedComponents = Array.isArray(step?.meta?.selectedComponents)
		? step.meta.selectedComponents
		: [];
	const nextSelectedComponents = selectedComponents.map((entry) =>
		String(entry?.uid) === String(input.component?.uid)
			? {
					...entry,
					salesPrice: input.price,
					basePrice:
						entry?.basePrice == null ? input.price : Number(entry.basePrice),
				}
			: entry,
	);
	const isTargetStep =
		String(step?.prodUid || "") === String(input.component?.uid);
	const totalSales = nextSelectedComponents.reduce(
		(sum, entry) => sum + Number(entry?.salesPrice || 0),
		0,
	);
	const totalBase = nextSelectedComponents.reduce(
		(sum, entry) => sum + Number(entry?.basePrice || 0),
		0,
	);
	const hasSelectedComponents = nextSelectedComponents.length > 0;
	steps[input.stepIndex] = {
		...step,
		price: hasSelectedComponents
			? totalSales
			: isTargetStep
				? input.price
				: step?.price,
		basePrice: hasSelectedComponents
			? totalBase
			: isTargetStep
				? (input.fallbackBasePrice ?? step?.basePrice ?? input.price)
				: step?.basePrice,
		meta: {
			...(step.meta || {}),
			selectedComponents: nextSelectedComponents,
		},
	};

	return {
		formSteps: steps,
	};
}
