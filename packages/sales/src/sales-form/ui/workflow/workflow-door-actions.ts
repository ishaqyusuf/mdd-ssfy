import { divideMoney } from "../../../payment-system/domain/money";
import {
	compactStepValue,
	deriveDoorSizeCandidates,
	getRouteConfigForLine,
	getSelectedDoorComponentsForLine,
	getSelectedProdUids,
	normalizeHptDoorRowForLegacy,
	readSalesFormObjectMetadata,
	summarizeDoors,
} from "../../domain";
import { snapshotSelectedComponent } from "./component-utils";
import {
	computeSharedDoorSurcharge,
	getDoorSupplierMeta,
	repricePersistedDoorRowsForSupplier,
	resolveWorkflowDoorSizePricing,
} from "./door-utils";
import {
	type DoorStoredRow,
	type WorkflowComponentRecord,
	type WorkflowHousePackageToolRecord,
	type WorkflowLineItemRecord,
	type WorkflowStepRecord,
	getWorkflowSteps,
	isMultiSelectStepTitle,
} from "./workflow-records";
import { buildWorkflowDoorRowsPatch } from "./workflow-row-patches";

export type WorkflowDoorActionPatch = {
	formSteps?: WorkflowStepRecord[];
	housePackageTool?: WorkflowHousePackageToolRecord | null;
	qty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
};

function averageUnitPrice(totalPrice: number, totalQty: number) {
	return totalQty > 0 ? divideMoney(totalPrice, totalQty) : 0;
}

function readWorkflowStepMeta(step?: WorkflowStepRecord | null) {
	return readSalesFormObjectMetadata(step?.meta) || {};
}

function readSelectedComponents(step?: WorkflowStepRecord | null) {
	const meta = readWorkflowStepMeta(step);
	return Array.isArray(meta.selectedComponents)
		? (meta.selectedComponents as WorkflowComponentRecord[])
		: [];
}

function replaceHptDoorRowSize(input: {
	row: DoorStoredRow;
	targetSize: string;
	component: WorkflowComponentRecord;
	supplierUid?: string | null;
	salesMultiplier?: number | null;
	profileCoefficient?: number | null;
	sharedDoorSurcharge: number;
	noHandle?: boolean;
	hasSwing?: boolean;
}) {
	const pricing = resolveWorkflowDoorSizePricing({
		component: input.component,
		size: input.targetSize,
		supplierUid: input.supplierUid,
		salesMultiplier: input.salesMultiplier,
		profileCoefficient: input.profileCoefficient,
		sharedDoorSurcharge: input.sharedDoorSurcharge,
	});
	const meta = readSalesFormObjectMetadata(input.row.meta) || {};
	const normalized = normalizeHptDoorRowForLegacy(
		{
			...input.row,
			dimension: input.targetSize,
			jambSizePrice: pricing.doorSalesUnitPrice,
			unitPrice: pricing.unitPrice,
			customPrice: null,
			meta: {
				...meta,
				baseUnitPrice: pricing.basePrice,
				doorSalesUnitPrice: pricing.doorSalesUnitPrice,
				priceMissing: !pricing.hasPrice,
				pendingUnpricedSizeSwap: !pricing.hasPrice,
				overridePrice: null,
				customPrice: null,
				componentUid: meta.componentUid || input.component.uid || null,
				componentTitle: meta.componentTitle || input.component.title || null,
			},
		},
		{
			profileCoefficient: input.profileCoefficient,
			sharedDoorSurcharge: input.sharedDoorSurcharge,
			noHandle: input.noHandle,
			hasSwing: input.hasSwing,
		},
	) as DoorStoredRow;

	if (pricing.hasPrice) return normalized;
	return {
		...normalized,
		jambSizePrice: 0,
		unitPrice: 0,
		lineTotal: 0,
		meta: {
			...(normalized.meta || {}),
			doorSalesUnitPrice: 0,
			calculatedFinalUnitPrice: 0,
			finalUnitPrice: 0,
			priceMissing: true,
			pendingUnpricedSizeSwap: true,
		},
	};
}

function isSameHptDoorRow(left: DoorStoredRow, right: DoorStoredRow) {
	if (left.id != null && right.id != null) {
		return String(left.id) === String(right.id);
	}
	return (
		Number(left.stepProductId || 0) === Number(right.stepProductId || 0) &&
		String(left.dimension || "")
			.trim()
			.toLowerCase() ===
			String(right.dimension || "")
				.trim()
				.toLowerCase()
	);
}

export function swapWorkflowHptDoorRowSize(input: {
	line: WorkflowLineItemRecord;
	rows: DoorStoredRow[];
	sourceRow: DoorStoredRow;
	targetSize: string;
	component: WorkflowComponentRecord;
	supplierUid?: string | null;
	salesMultiplier?: number | null;
	profileCoefficient?: number | null;
	sharedDoorSurcharge: number;
	noHandle?: boolean;
	hasSwing?: boolean;
}): { linePatch: WorkflowDoorActionPatch } | null {
	const targetSize = String(input.targetSize || "").trim();
	if (
		!targetSize ||
		targetSize === String(input.sourceRow.dimension || "").trim()
	) {
		return null;
	}
	const componentId = Number(
		input.component.id || input.sourceRow.stepProductId || 0,
	);
	const duplicate = input.rows.some(
		(row) =>
			!isSameHptDoorRow(row, input.sourceRow) &&
			Number(row.stepProductId || 0) === componentId &&
			String(row.dimension || "")
				.trim()
				.toLowerCase() === targetSize.toLowerCase(),
	);
	if (duplicate) return null;

	const nextRows = input.rows.map((row) =>
		isSameHptDoorRow(row, input.sourceRow)
			? replaceHptDoorRowSize({ ...input, row, targetSize })
			: row,
	);
	const next = buildWorkflowDoorRowsPatch({
		line: input.line,
		rows: nextRows,
		sharedDoorSurcharge: input.sharedDoorSurcharge,
		noHandle: input.noHandle,
		hasSwing: input.hasSwing,
		profileCoefficient: input.profileCoefficient,
		preserveUnpricedRows: true,
		skipRowNormalization: true,
	});
	return { linePatch: next.linePatch };
}

function splitDoorDimension(value?: string | null) {
	const [width = "", height = ""] = String(value || "")
		.trim()
		.split(/\s*[x×✕]\s*/i);
	return { width: width.trim(), height: height.trim() };
}

export function reconcileWorkflowHptRowsForHeightChange(input: {
	line: WorkflowLineItemRecord;
	nextSteps: WorkflowStepRecord[];
	routeData?: unknown;
	availableDoorComponents?: WorkflowComponentRecord[];
	salesMultiplier?: number | null;
	profileCoefficient?: number | null;
}): WorkflowDoorActionPatch | null {
	const currentHeight = getWorkflowSteps(input.line).find(
		(step) =>
			String(step?.step?.title || "")
				.trim()
				.toLowerCase() === "height",
	)?.value;
	const nextHeight = input.nextSteps.find(
		(step) =>
			String(step?.step?.title || "")
				.trim()
				.toLowerCase() === "height",
	)?.value;
	if (
		!String(nextHeight || "").trim() ||
		String(currentHeight || "")
			.trim()
			.toLowerCase() ===
			String(nextHeight || "")
				.trim()
				.toLowerCase()
	) {
		return null;
	}

	const rows = Array.isArray(input.line.housePackageTool?.doors)
		? (input.line.housePackageTool?.doors as DoorStoredRow[])
		: [];
	if (!rows.length) return null;

	const nextLine = { ...input.line, formSteps: input.nextSteps };
	const selectedComponents = getSelectedDoorComponentsForLine(nextLine) as
		| WorkflowComponentRecord[]
		| undefined;
	const resolvedComponents = [
		...(selectedComponents || []),
		...(input.availableDoorComponents || []),
	];
	const componentById = new Map(
		resolvedComponents.map((component) => [
			Number(component.id || 0),
			component,
		]),
	);
	const componentByUid = new Map(
		resolvedComponents.map((component) => [
			String(component.uid || ""),
			component,
		]),
	);
	const doorStep = input.nextSteps.find(
		(step) =>
			String(step?.step?.title || "")
				.trim()
				.toLowerCase() === "door",
	);
	const supplierUid = getDoorSupplierMeta(doorStep).supplierUid;
	const sharedDoorSurcharge = computeSharedDoorSurcharge(nextLine);
	const normalizedNextHeight = String(nextHeight || "").trim();
	const plannedRows = rows.map((row) => {
		const { width } = splitDoorDimension(row.dimension);
		if (!width) return { row, targetSize: null, component: null };
		const rowMeta = readSalesFormObjectMetadata(row.meta) || {};
		const component = componentById.get(Number(row.stepProductId || 0)) ||
			(rowMeta.componentUid
				? componentByUid.get(String(rowMeta.componentUid))
				: undefined) || {
				id: row.stepProductId || null,
				uid: rowMeta.componentUid || null,
				title: rowMeta.componentTitle || "Saved Door",
				pricing: {},
			};
		const candidates = deriveDoorSizeCandidates(
			nextLine,
			(component.pricing || {}) as Record<string, unknown>,
			input.routeData,
			{ ignorePersistedVariations: true },
		);
		const targetSize =
			candidates.find((candidate) => {
				const dimension = splitDoorDimension(candidate);
				return (
					dimension.width.toLowerCase() === width.toLowerCase() &&
					dimension.height.toLowerCase() === normalizedNextHeight.toLowerCase()
				);
			}) || `${width} x ${normalizedNextHeight}`;
		return { row, targetSize, component };
	});
	const targetIdentities = new Set<string>();
	for (const plan of plannedRows) {
		if (!plan.targetSize || !plan.component) continue;
		const identity = `${Number(plan.component.id || plan.row.stepProductId || 0)}:${plan.targetSize.trim().toLowerCase()}`;
		if (targetIdentities.has(identity)) return null;
		targetIdentities.add(identity);
	}
	const nextRows = plannedRows.map(({ row, targetSize, component }) => {
		if (!targetSize || !component) return row;
		const routeConfig = getRouteConfigForLine({
			routeData: input.routeData,
			line: nextLine,
			step: doorStep,
			component,
		});
		return replaceHptDoorRowSize({
			row,
			targetSize,
			component,
			supplierUid,
			salesMultiplier:
				input.salesMultiplier ??
				computeSalesMultiplier(input.profileCoefficient),
			profileCoefficient: input.profileCoefficient,
			sharedDoorSurcharge,
			noHandle: Boolean(routeConfig?.noHandle),
			hasSwing: routeConfig?.hasSwing !== false,
		});
	});
	const next = buildWorkflowDoorRowsPatch({
		line: nextLine,
		rows: nextRows,
		sharedDoorSurcharge,
		profileCoefficient: input.profileCoefficient,
		preserveUnpricedRows: true,
		skipRowNormalization: true,
	});
	return next.linePatch;
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
	const currentMeta = readWorkflowStepMeta(step);
	const currentFormStepMeta =
		readSalesFormObjectMetadata(currentMeta.formStepMeta) || {};
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

	const selectedComponents = readSelectedComponents(step);
	const nextSelectedComponents = selectedComponents.map((component) =>
		String(component?.uid || "") === sourceUid
			? {
					...snapshotSelectedComponent(input.targetComponent),
					redirectUid:
						component?.redirectUid ||
						input.targetComponent?.redirectUid ||
						null,
				}
			: component,
	);
	const nextSelectedUids = nextSelectedComponents
		.map((component) => String(component?.uid || ""))
		.filter(
			(uid, index, list) =>
				Boolean(uid) && list.findIndex((entry) => entry === uid) === index,
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
			...readWorkflowStepMeta(step),
			selectedProdUids: nextSelectedUids,
			selectedComponents: nextSelectedComponents,
		},
	};
	steps[input.stepIndex] = nextStep;

	const sourceId = Number(input.sourceComponent?.id || 0);
	const targetId = Number(input.targetComponent?.id || 0);
	const remappedDoors = (
		((input.line as any).housePackageTool?.doors || []) as DoorStoredRow[]
	).map((row) =>
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

export function addWorkflowHptDoorOption(input: {
	line: WorkflowLineItemRecord;
	stepIndex: number;
	component: WorkflowComponentRecord;
}): { linePatch: WorkflowDoorActionPatch; activeDoorUid: string } | null {
	const componentUid = String(input.component?.uid || "");
	if (!componentUid) return null;

	const steps = [...getWorkflowSteps(input.line)];
	const step = steps[input.stepIndex];
	if (!step) return null;

	const existingSelectedComponents = readSelectedComponents(step);
	if (
		existingSelectedComponents.some(
			(component) => String(component?.uid || "") === componentUid,
		)
	) {
		return null;
	}

	const selectedComponents = [
		...existingSelectedComponents,
		snapshotSelectedComponent(input.component) as WorkflowComponentRecord,
	];
	const selectedUids = [
		...getSelectedProdUids(step).map((uid) => String(uid)),
		componentUid,
	].filter(
		(uid, index, list) =>
			Boolean(uid) && list.findIndex((entry) => entry === uid) === index,
	);
	steps[input.stepIndex] = summarizeSelectionStep(
		step,
		selectedUids,
		selectedComponents,
	);

	return {
		activeDoorUid: componentUid,
		linePatch: {
			formSteps: steps,
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
		const selectedComponents = readSelectedComponents(step).filter(
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
			...readWorkflowStepMeta(step),
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
	const selectedComponents = readSelectedComponents(step).filter(
		(entry) => String(entry?.uid || "") !== componentUid,
	) as WorkflowComponentRecord[];
	steps[input.stepIndex] = summarizeSelectionStep(
		step,
		selectedUids,
		selectedComponents,
	);

	const existingRows = Array.isArray(
		(input.line as any).housePackageTool?.doors,
	)
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
			...readWorkflowStepMeta(step),
			selectedProdUids: selectedUids.map((uid) => String(uid)),
			selectedComponents,
		},
	};
}

function computeSalesMultiplier(profileCoefficient?: number | null) {
	return Number.isFinite(Number(profileCoefficient)) &&
		Number(profileCoefficient) > 0
		? divideMoney(1, Number(profileCoefficient))
		: 1;
}
