import {
	compactStepValue,
	getRouteConfigForLine,
	getSelectedProdUids,
	summarizeDoors,
} from "../../domain";
import { snapshotSelectedComponent } from "./component-utils";
import {
	getDoorSupplierMeta,
	repricePersistedDoorRowsForSupplier,
} from "./door-utils";
import {
	getWorkflowSteps,
	isMultiSelectStepTitle,
	type DoorStoredRow,
	type WorkflowComponentRecord,
	type WorkflowLineItemRecord,
	type WorkflowStepRecord,
} from "./workflow-records";

export type WorkflowDoorActionPatch = {
	formSteps?: WorkflowStepRecord[];
	housePackageTool?: unknown;
	qty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
};

function averageUnitPrice(totalPrice: number, totalQty: number) {
	return totalQty > 0 ? Number((totalPrice / totalQty).toFixed(2)) : 0;
}

export function updateWorkflowDoorSupplier(input: {
	line: WorkflowLineItemRecord;
	stepIndex: number;
	supplier?: { uid?: string | null; name?: string | null } | null;
	profileCoefficient?: number | null;
}): WorkflowDoorActionPatch | null {
	const steps = [...getWorkflowSteps(input.line)];
	const step = steps[input.stepIndex];
	if (!step) return null;
	const currentMeta = step.meta || {};
	const currentFormStepMeta =
		(currentMeta.formStepMeta as Record<string, unknown> | null) || {};
	steps[input.stepIndex] = {
		...step,
		meta: {
			...currentMeta,
			formStepMeta: {
				...currentFormStepMeta,
				supplierUid: input.supplier?.uid || null,
				supplierName: input.supplier?.name || null,
			},
		},
	};

	const repricedDoors = repricePersistedDoorRowsForSupplier({
		line: input.line as any,
		nextSteps: steps as any,
		supplierUid: input.supplier?.uid || null,
		salesMultiplier: computeSalesMultiplier(input.profileCoefficient),
	});
	const linePatch: WorkflowDoorActionPatch = {
		formSteps: steps,
	};
	if (repricedDoors) {
		linePatch.housePackageTool = {
			...((input.line as any).housePackageTool || { id: null }),
			doors: repricedDoors.doors,
			totalDoors: repricedDoors.totalDoors,
			totalPrice: repricedDoors.totalPrice,
		};
		linePatch.qty = repricedDoors.totalDoors;
		linePatch.unitPrice = averageUnitPrice(
			repricedDoors.totalPrice,
			repricedDoors.totalDoors,
		);
		linePatch.lineTotal = repricedDoors.totalPrice;
	}
	return linePatch;
}

export function swapWorkflowDoorComponent(input: {
	line: WorkflowLineItemRecord;
	stepIndex: number;
	sourceComponent: WorkflowComponentRecord;
	targetComponent: WorkflowComponentRecord;
	profileCoefficient?: number | null;
}): { linePatch: WorkflowDoorActionPatch; activeDoorUid: string } | null {
	const steps = [...getWorkflowSteps(input.line)];
	const step = steps[input.stepIndex];
	if (!step || !input.sourceComponent || !input.targetComponent) return null;
	const sourceUid = String(input.sourceComponent?.uid || "");
	const targetUid = String(input.targetComponent?.uid || "");
	if (!sourceUid || !targetUid || sourceUid === targetUid) return null;

	const selectedComponents = Array.isArray(step?.meta?.selectedComponents)
		? step.meta.selectedComponents
		: [];
	const nextSelectedComponents = selectedComponents.map((component) =>
		String(component?.uid || "") === sourceUid
			? {
					...snapshotSelectedComponent(input.targetComponent),
					redirectUid:
						component?.redirectUid || input.targetComponent?.redirectUid || null,
				}
			: component,
	);

	const nextStep = {
		...step,
		componentId:
			String(step?.prodUid || "") === sourceUid
				? input.targetComponent?.id || step?.componentId || null
				: step?.componentId,
		prodUid:
			String(step?.prodUid || "") === sourceUid ? targetUid : step?.prodUid,
		value:
			String(step?.prodUid || "") === sourceUid
				? input.targetComponent?.title || step?.value || ""
				: step?.value,
		meta: {
			...(step?.meta || {}),
			selectedComponents: nextSelectedComponents,
		},
	};
	steps[input.stepIndex] = nextStep;

	const sourceId = Number(input.sourceComponent?.id || 0);
	const targetId = Number(input.targetComponent?.id || 0);
	const remappedDoors = (((input.line as any).housePackageTool?.doors ||
		[]) as DoorStoredRow[]).map((row) =>
		Number(row?.stepProductId || 0) === sourceId
			? {
					...row,
					stepProductId: targetId || row?.stepProductId || null,
				}
			: row,
	);
	const lineWithRemappedDoors = {
		...input.line,
		formSteps: steps,
		housePackageTool: {
			...((input.line as any).housePackageTool || { id: null }),
			doors: remappedDoors,
		},
	};
	const repricedDoors = repricePersistedDoorRowsForSupplier({
		line: lineWithRemappedDoors as any,
		nextSteps: steps as any,
		supplierUid: getDoorSupplierMeta(nextStep).supplierUid,
		salesMultiplier: computeSalesMultiplier(input.profileCoefficient),
	});

	return {
		activeDoorUid: targetUid,
		linePatch: {
			formSteps: steps,
			...(repricedDoors
				? {
						housePackageTool: {
							...((input.line as any).housePackageTool || { id: null }),
							doors: repricedDoors.doors,
							totalDoors: repricedDoors.totalDoors,
							totalPrice: repricedDoors.totalPrice,
						},
						qty: repricedDoors.totalDoors,
						unitPrice: averageUnitPrice(
							repricedDoors.totalPrice,
							repricedDoors.totalDoors,
						),
						lineTotal: repricedDoors.totalPrice,
					}
				: {}),
		},
	};
}

export function removeWorkflowSelectedComponent(input: {
	line: WorkflowLineItemRecord;
	stepIndex: number;
	componentUid: string;
}): { linePatch: WorkflowDoorActionPatch; activeStepIndex: number } | null {
	const steps = [...getWorkflowSteps(input.line)];
	const step = steps[input.stepIndex];
	if (!step) return null;
	if (isMultiSelectStepTitle(step?.step?.title)) {
		const selectedUids = getSelectedProdUids(step)
			.map((uid) => String(uid))
			.filter((uid) => uid !== input.componentUid);
		const selectedComponents = (
			Array.isArray(step?.meta?.selectedComponents)
				? step.meta.selectedComponents
				: []
		).filter(
			(component) => String(component?.uid) !== input.componentUid,
		) as WorkflowComponentRecord[];
		steps[input.stepIndex] = summarizeSelectionStep(
			step,
			selectedUids,
			selectedComponents,
		);
		return {
			linePatch: {
				formSteps: steps.slice(0, input.stepIndex + 1),
			},
			activeStepIndex: input.stepIndex,
		};
	}
	steps[input.stepIndex] = {
		...step,
		componentId: null,
		prodUid: "",
		value: "",
		price: 0,
		basePrice: 0,
		meta: {
			...(step.meta || {}),
			redirectUid: null,
			sectionOverride: null,
			selectedProdUids: [],
			selectedComponents: [],
		},
	};
	return {
		linePatch: {
			formSteps: steps.slice(0, input.stepIndex + 1),
		},
		activeStepIndex: input.stepIndex,
	};
}

export function removeWorkflowHptDoorOption(input: {
	routeData: unknown;
	line: WorkflowLineItemRecord;
	stepIndex: number;
	component: WorkflowComponentRecord;
}): {
	linePatch: WorkflowDoorActionPatch;
	activeDoorUid: string | null;
} | null {
	const componentUid = String(input.component?.uid || "");
	const componentId = Number(input.component?.id || 0);
	if (!componentUid) return null;

	const steps = [...getWorkflowSteps(input.line)];
	const step = steps[input.stepIndex];
	if (!step) return null;

	const selectedUids = getSelectedProdUids(step)
		.map((uid) => String(uid))
		.filter((uid) => uid !== componentUid);
	const selectedComponents = (
		Array.isArray(step?.meta?.selectedComponents)
			? step.meta.selectedComponents
			: []
	).filter(
		(entry) => String(entry?.uid || "") !== componentUid,
	) as WorkflowComponentRecord[];
	steps[input.stepIndex] = summarizeSelectionStep(
		step,
		selectedUids,
		selectedComponents,
	);

	const existingRows = Array.isArray((input.line as any).housePackageTool?.doors)
		? (((input.line as any).housePackageTool.doors || []) as DoorStoredRow[])
		: [];
	const nextRows = existingRows.filter(
		(row) => Number(row?.stepProductId || 0) !== componentId,
	);
	const nextActiveDoor =
		selectedComponents.find(
			(entry) => String(entry?.uid || "") !== componentUid,
		) || null;
	const nextRouteConfig = getRouteConfigForLine({
		routeData: input.routeData,
		line: {
			...input.line,
			formSteps: steps,
		},
		step: steps[input.stepIndex],
		component: nextActiveDoor,
	});
	const nextSummary = summarizeDoors(nextRows, {
		noHandle: !!nextRouteConfig?.noHandle,
		hasSwing: !!nextRouteConfig?.hasSwing,
	});

	return {
		activeDoorUid: nextActiveDoor?.uid ? String(nextActiveDoor.uid) : null,
		linePatch: {
			formSteps: steps,
			housePackageTool: {
				...((input.line as any).housePackageTool || { id: null }),
				doors: nextSummary.rows,
				totalDoors: nextSummary.totalDoors,
				totalPrice: nextSummary.totalPrice,
			},
			qty: nextSummary.totalDoors,
			unitPrice: averageUnitPrice(
				nextSummary.totalPrice,
				nextSummary.totalDoors,
			),
			lineTotal: nextSummary.totalPrice,
		},
	};
}

function summarizeSelectionStep(
	step: WorkflowStepRecord,
	selectedUids: string[],
	selectedComponents: WorkflowComponentRecord[],
) {
	const totalSales = selectedComponents.reduce(
		(sum, entry) => sum + Number(entry?.salesPrice || 0),
		0,
	);
	const totalBase = selectedComponents.reduce(
		(sum, entry) => sum + Number(entry?.basePrice || 0),
		0,
	);
	return {
		...step,
		prodUid: String(selectedUids[0] || ""),
		componentId: selectedComponents[0]?.id || null,
		value: compactStepValue(selectedComponents),
		price: selectedComponents.length ? totalSales : 0,
		basePrice: selectedComponents.length ? totalBase : 0,
		meta: {
			...(step?.meta || {}),
			selectedProdUids: selectedUids.map((uid) => String(uid)),
			selectedComponents,
		},
	};
}

function computeSalesMultiplier(profileCoefficient?: number | null) {
	return Number.isFinite(Number(profileCoefficient)) && Number(profileCoefficient) > 0
		? Number((1 / Number(profileCoefficient)).toFixed(2))
		: 1;
}
