import {
	applyMultiSelectStepMutation,
	applySingleSelectStepMutation,
	getSelectedProdUids,
	buildConfiguredRouteSteps,
	compactStepValue,
	mergeConfiguredSeriesWithExisting,
	normalizeSalesFormTitle as normalizeTitle,
	readSalesFormObjectMetadata,
	rebuildStepsFromSelection,
} from "../../domain";
import { snapshotSelectedComponent } from "./component-utils";
import {
	firstPendingStepIndex,
	isMultiSelectStepTitle,
	resolveInteractiveStepIndex,
	type WorkflowComponentRecord,
	type WorkflowLineItemRecord,
	type WorkflowStepRecord,
} from "./workflow-records";

export type WorkflowSelectionPatch = {
	formSteps: WorkflowStepRecord[];
	title?: string | null;
};

export type WorkflowSelectionActionResult = {
	linePatch: WorkflowSelectionPatch;
	activeStepIndex: number;
};

export type SaveWorkflowSelectedComponentInput = {
	routeData: unknown;
	line: WorkflowLineItemRecord;
	steps: WorkflowStepRecord[];
	currentStepIndex: number;
	component: WorkflowComponentRecord;
	visibleComponents: WorkflowComponentRecord[];
	activeStepTitle?: string | null;
	selectedOverride?: boolean;
};

function readStepMeta(step?: WorkflowStepRecord | null) {
	return readSalesFormObjectMetadata(step?.meta) || {};
}

function readSelectedComponents(step?: WorkflowStepRecord | null) {
	const meta = readStepMeta(step);
	return Array.isArray(meta.selectedComponents)
		? (meta.selectedComponents as WorkflowComponentRecord[])
		: [];
}

export function saveWorkflowSelectedComponent(
	input: SaveWorkflowSelectedComponentInput,
): WorkflowSelectionActionResult | null {
	const nextSteps = [...input.steps];
	const current = nextSteps[input.currentStepIndex];
	if (!current) return null;

	if (isMultiSelectStepTitle(current?.step?.title)) {
		const multiMutation = applyMultiSelectStepMutation({
			steps: nextSteps,
			currentStepIndex: input.currentStepIndex,
			component: input.component,
			visibleComponents: input.visibleComponents,
			selectedOverride: input.selectedOverride,
			activeStepTitle: input.activeStepTitle || "",
		});

		return {
			linePatch: {
				formSteps: multiMutation.hasSelection
					? multiMutation.steps
					: multiMutation.steps.slice(0, input.currentStepIndex + 1),
			},
			activeStepIndex: input.currentStepIndex,
		};
	}

	const singleMutationSteps = applySingleSelectStepMutation({
		steps: nextSteps,
		currentStepIndex: input.currentStepIndex,
		component: input.component,
		activeStepTitle: input.activeStepTitle || "",
	}) as WorkflowStepRecord[];

	const selectedStepTitle = normalizeTitle(
		singleMutationSteps[input.currentStepIndex]?.step?.title,
	);
	const isItemTypeStep =
		input.currentStepIndex === 0 || selectedStepTitle === "item type";
	if (isItemTypeStep) {
		const rootUid =
			singleMutationSteps[input.currentStepIndex]?.step?.uid ||
			(input.routeData as any)?.stepsById?.[
				singleMutationSteps[input.currentStepIndex]?.stepId || -1
			] ||
			(input.routeData as any)?.rootStepUid;
		const rootStep = rootUid
			? (input.routeData as any)?.stepsByUid?.[rootUid]
			: null;
		if (rootStep) {
			const configuredSeries = buildConfiguredRouteSteps(
				input.routeData,
				rootStep,
				toSelectedComponent(input.component),
			) as WorkflowStepRecord[];
			const mergedSeries = mergeConfiguredSeriesWithExisting(
				singleMutationSteps,
				configuredSeries,
			) as WorkflowStepRecord[];
			return {
				linePatch: {
					formSteps: mergedSeries,
				},
				activeStepIndex: mergedSeries.length > 1 ? 1 : 0,
			};
		}
	}

	const routed = rebuildStepsFromSelection({
		routeData: input.routeData,
		line: input.line,
		steps: singleMutationSteps,
		startIndex: input.currentStepIndex,
		selectedComponent: {
			...toSelectedComponent(input.component),
			redirectUid:
				readStepMeta(singleMutationSteps[input.currentStepIndex]).redirectUid ||
				input.component.redirectUid ||
				null,
		},
	});
	const activeStepIndex = resolveInteractiveStepIndex(
		routed.steps,
		routed.steps[input.currentStepIndex + 1] != null
			? input.currentStepIndex + 1
			: routed.activeIndex,
	);
	return {
		linePatch: {
			formSteps: routed.steps,
		},
		activeStepIndex,
	};
}

export type ProceedWorkflowMultiSelectStepInput = {
	routeData: unknown;
	line: WorkflowLineItemRecord;
	stepIndex: number;
	visibleComponents: WorkflowComponentRecord[];
};

export function proceedWorkflowMultiSelectStep(
	input: ProceedWorkflowMultiSelectStepInput,
): WorkflowSelectionActionResult | null {
	const steps = input.line.formSteps || [];
	const step = steps[input.stepIndex];
	if (!step) return null;
	const selectedUids = getSelectedProdUids(step);
	if (!selectedUids.length) return null;
	const candidates = selectedUids
		.map(
			(uid) =>
				input.visibleComponents.find((component) => component.uid === uid) ||
				readSelectedComponents(step).find(
					(component) => component.uid === uid,
				),
		)
		.filter(Boolean) as WorkflowComponentRecord[];
	const primary = candidates[0];
	if (!primary) return null;
	const routed = rebuildStepsFromSelection({
		routeData: input.routeData,
		line: input.line,
		steps,
		startIndex: input.stepIndex,
		selectedComponent: {
			...toSelectedComponent(primary),
			redirectUid: readStepMeta(step).redirectUid || primary.redirectUid || null,
		},
	});
	const lineItemStepIndex = routed.steps.findIndex((step) =>
		normalizeTitle(step?.step?.title).includes("line item"),
	);
	return {
		linePatch: {
			formSteps: routed.steps,
		},
		activeStepIndex:
			lineItemStepIndex >= 0
				? lineItemStepIndex
				: resolveInteractiveStepIndex(
						routed.steps,
						routed.steps[input.stepIndex + 1] != null
							? input.stepIndex + 1
							: routed.activeIndex,
					),
	};
}

export type SelectWorkflowRootComponentInput = {
	routeData: unknown;
	line: WorkflowLineItemRecord;
	component: WorkflowComponentRecord;
};

export function selectWorkflowRootComponent(
	input: SelectWorkflowRootComponentInput,
): WorkflowSelectionActionResult | null {
	const rootStep = (input.routeData as any)?.rootStepUid
		? (input.routeData as any)?.stepsByUid?.[(input.routeData as any).rootStepUid]
		: null;
	if (!rootStep) return null;

	const routedSteps = buildConfiguredRouteSteps(
		input.routeData,
		rootStep,
		toSelectedComponent(input.component),
	) as WorkflowStepRecord[];

	return {
		linePatch: {
			formSteps: routedSteps,
			title:
				normalizeTitle(input.line.title).startsWith("new line") ||
				!String(input.line.title || "").trim()
					? input.component.title || input.line.title || null
					: input.line.title || null,
		},
		activeStepIndex: firstPendingStepIndex(routedSteps),
	};
}

export function selectAllWorkflowComponents(input: {
	line: WorkflowLineItemRecord;
	stepIndex: number;
	components: WorkflowComponentRecord[];
}): WorkflowSelectionPatch | null {
	const steps = [...(input.line.formSteps || [])];
	const step = steps[input.stepIndex];
	if (!step) return null;
	const selectedComponents = input.components.map((component) =>
		snapshotSelectedComponent(component),
	);
	const selectedProdUids = selectedComponents
		.map((component) => component.uid)
		.filter(Boolean);
	const totalSales = selectedComponents.reduce(
		(sum, component) => sum + Number(component.salesPrice || 0),
		0,
	);
	const totalBase = selectedComponents.reduce(
		(sum, component) => sum + Number(component.basePrice || 0),
		0,
	);
	steps[input.stepIndex] = {
		...step,
		componentId: selectedComponents[0]?.id || null,
		prodUid: selectedComponents[0]?.uid || "",
		value: compactStepValue(selectedComponents),
		price: totalSales,
		basePrice: totalBase,
		meta: {
			...readStepMeta(step),
			selectedProdUids,
			selectedComponents,
		},
	};
	return { formSteps: steps };
}

export function setWorkflowStepRedirect(input: {
	line: WorkflowLineItemRecord;
	stepIndex: number;
	redirectUid?: string | null;
}): WorkflowSelectionPatch | null {
	const steps = [...(input.line.formSteps || [])];
	const step = steps[input.stepIndex];
	if (!step) return null;
	steps[input.stepIndex] = {
		...step,
		meta: {
			...readStepMeta(step),
			redirectUid: input.redirectUid || null,
		},
	};
	return { formSteps: steps };
}

export function setWorkflowComponentRedirect(input: {
	routeData: unknown;
	line: WorkflowLineItemRecord;
	stepIndex: number;
	componentUid: string;
	redirectUid?: string | null;
}): WorkflowSelectionActionResult | null {
	const steps = [...(input.line.formSteps || [])];
	const step = steps[input.stepIndex];
	if (!step) return null;
	const stepMeta = readStepMeta(step);
	const selectedComponents = readSelectedComponents(step);
	const nextSelectedComponents = selectedComponents.map((component) =>
		String(component?.uid || "") === String(input.componentUid || "")
			? {
					...component,
					redirectUid: input.redirectUid || null,
				}
			: component,
	);
	steps[input.stepIndex] = {
		...step,
		meta: {
			...stepMeta,
			redirectUid:
				String(step?.prodUid || "") === String(input.componentUid || "")
					? input.redirectUid || null
					: stepMeta.redirectUid || null,
			selectedComponents: nextSelectedComponents,
		},
	};
	const selectedForRouting =
		String(step?.prodUid || "") === String(input.componentUid || "")
			? nextSelectedComponents.find(
					(component) =>
						String(component?.uid || "") === String(input.componentUid || ""),
				) || {
					uid: input.componentUid,
					title: step?.value || "",
					redirectUid: input.redirectUid || null,
				}
			: null;
	if (!selectedForRouting) {
		return {
			linePatch: {
				formSteps: steps,
			},
			activeStepIndex: input.stepIndex,
		};
	}
	const routed = rebuildStepsFromSelection({
		routeData: input.routeData,
		line: input.line,
		steps,
		startIndex: input.stepIndex,
		selectedComponent: {
			uid: String(selectedForRouting.uid || ""),
			title: selectedForRouting.title,
			redirectUid: selectedForRouting.redirectUid || null,
		},
	});
	return {
		linePatch: {
			formSteps: routed.steps,
		},
		activeStepIndex: resolveInteractiveStepIndex(
			routed.steps,
			routed.activeIndex,
		),
	};
}

function toSelectedComponent(component: WorkflowComponentRecord) {
	const metaData = readSalesFormObjectMetadata(component?._metaData) || {};
	const custom =
		component?.custom === true ||
		(metaData as { custom?: boolean }).custom === true;
	return {
		uid: String(component.uid || ""),
		title: component.title || null,
		redirectUid: component.redirectUid || null,
		id: component.id || null,
		img: component.img || null,
		salesPrice: component.salesPrice ?? null,
		basePrice: component.basePrice ?? null,
		custom,
		_metaData: {
			...metaData,
			custom,
		},
	};
}
