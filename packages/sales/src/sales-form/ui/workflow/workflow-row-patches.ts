import {
	buildShelfSections,
	deriveMouldingRows,
	deriveServiceRows,
	flattenShelfSections,
	getSelectedMouldingComponentsForLine,
	sharedMouldingComponentPrice,
	summarizeDoors,
	summarizeMouldingPersistRows,
	summarizeServiceRows,
	summarizeShelfRows,
} from "../../domain";
import { applySharedDoorSurcharge } from "./door-utils";
import {
	getStoredMouldingRows,
	getStoredServiceRows,
	getWorkflowSteps,
	type DoorStoredRow,
	type MouldingRow,
	type ServiceRow,
	type ShelfSectionDraft,
	type WorkflowLineItemRecord,
} from "./workflow-records";

type LinePatch = Record<string, unknown>;

export type WorkflowMouldingRowsContext = {
	rows: MouldingRow[];
	selectedMouldings: ReturnType<typeof getSelectedMouldingComponentsForLine>;
	sharedComponentPrice: number;
	totalQty: number;
	totalAmount: number;
};

export type WorkflowServiceRowsContext = {
	rows: ServiceRow[];
};

export type WorkflowShelfSectionsContext = {
	sections: ShelfSectionDraft[];
};

export type WorkflowShelfSectionsPatch = {
	flatRows: unknown[];
	qty: number;
	unitPrice: number;
	lineTotal: number;
	linePatch: LinePatch;
};

export function buildWorkflowMouldingRowsContext(
	line: WorkflowLineItemRecord,
): WorkflowMouldingRowsContext {
	const selectedMouldings = getSelectedMouldingComponentsForLine(line);
	const existingRows = getStoredMouldingRows(line);
	const sharedComponentPrice = sharedMouldingComponentPrice(getWorkflowSteps(line));
	const rows = deriveMouldingRows({
		selectedMouldings,
		existingRows,
		sharedComponentPrice,
	});
	return {
		rows,
		selectedMouldings,
		sharedComponentPrice,
		totalQty: rows.reduce((sum, row) => sum + Number(row.qty || 0), 0),
		totalAmount: Number(
			rows
				.reduce((sum, row) => sum + Number(row.lineTotal || 0), 0)
				.toFixed(2),
		),
	};
}

export function buildWorkflowMouldingRowsPatch(input: {
	line: WorkflowLineItemRecord;
	rows: MouldingRow[];
	sharedComponentPrice?: number | null;
}) {
	const next = summarizeMouldingPersistRows(
		input.rows,
		input.sharedComponentPrice || 0,
	);
	return {
		meta: {
			...(input.line.meta || {}),
			mouldingRows: next.storedRows,
		},
		qty: next.qtyTotal,
		lineTotal: next.total,
		unitPrice: next.unitPrice,
	};
}

export function buildWorkflowServiceRowsContext(
	line: WorkflowLineItemRecord,
): WorkflowServiceRowsContext {
	const lineMeta = ((line as any).meta || {}) as {
		taxxable?: boolean;
		produceable?: boolean;
	};
	return {
		rows: deriveServiceRows({
			lineUid: String(line.uid || ""),
			existingRows: getStoredServiceRows(line),
			lineDescription: (line as any).description,
			lineQty: (line as any).qty,
			lineUnitPrice: (line as any).unitPrice,
			lineTaxxable: Boolean(lineMeta?.taxxable),
			lineProduceable: Boolean(lineMeta?.produceable),
		}),
	};
}

export function buildWorkflowServiceRowsPatch(input: {
	line: WorkflowLineItemRecord;
	rows: ServiceRow[];
}) {
	const next = summarizeServiceRows(String(input.line.uid || ""), input.rows);
	return {
		meta: {
			...(input.line.meta || {}),
			serviceRows: next.rows,
			taxxable: next.taxxable,
			produceable: next.produceable,
		},
		qty: next.qtyTotal,
		unitPrice: next.unitPrice,
		lineTotal: next.lineTotal,
		description: next.description,
	};
}

export function buildWorkflowShelfSectionsContext(
	line: WorkflowLineItemRecord,
	profileCoefficient?: number | null,
): WorkflowShelfSectionsContext {
	return {
		sections: buildShelfSections(
			((line as any).shelfItems || []) as unknown[],
			profileCoefficient,
		) as ShelfSectionDraft[],
	};
}

export function buildWorkflowShelfSectionsPatch(input: {
	sections: ShelfSectionDraft[];
	profileCoefficient?: number | null;
}): WorkflowShelfSectionsPatch {
	const flatRows = flattenShelfSections(
		input.sections,
		input.profileCoefficient,
	);
	const next = summarizeShelfRows(flatRows, input.profileCoefficient);
	return {
		flatRows,
		qty: next.qtyTotal,
		unitPrice: next.unitPrice,
		lineTotal: next.lineTotal,
		linePatch: {
			shelfItems: next.rows,
			qty: next.qtyTotal,
			unitPrice: next.unitPrice,
			lineTotal: next.lineTotal,
		},
	};
}

export function buildWorkflowDoorRowsPatch(input: {
	line: WorkflowLineItemRecord;
	rows: DoorStoredRow[];
	sharedDoorSurcharge?: number | null;
	noHandle?: boolean;
	hasSwing?: boolean;
	profileCoefficient?: number | null;
}) {
	const normalizedRows = applySharedDoorSurcharge(
		input.rows,
		Number(input.sharedDoorSurcharge || 0),
		input.profileCoefficient,
	);
	const next = summarizeDoors(normalizedRows, {
		noHandle: !!input.noHandle,
		hasSwing: input.hasSwing !== false,
	});
	return {
		rows: next.rows,
		totalDoors: next.totalDoors,
		totalPrice: next.totalPrice,
		linePatch: {
			housePackageTool: {
				...((input.line as any).housePackageTool || { id: null }),
				doors: next.rows,
				totalDoors: next.totalDoors,
				totalPrice: next.totalPrice,
			},
			qty: next.totalDoors || (input.line as any).qty,
			lineTotal: next.totalPrice || (input.line as any).lineTotal,
		},
	};
}

export function buildWorkflowDoorSizeVariantPatch(input: {
	line: WorkflowLineItemRecord;
	componentId?: number | null;
	rows: DoorStoredRow[];
	sharedDoorSurcharge?: number | null;
	profileCoefficient?: number | null;
}) {
	const existingDoors = Array.isArray((input.line as any).housePackageTool?.doors)
		? (((input.line as any).housePackageTool.doors || []) as DoorStoredRow[])
		: [];
	const targetComponentId = Number(input.componentId || 0);
	const retainedDoors = existingDoors.filter(
		(door) => Number(door.stepProductId || 0) !== targetComponentId,
	);
	const nextRows = applySharedDoorSurcharge(
		input.rows,
		Number(input.sharedDoorSurcharge || 0),
		input.profileCoefficient,
	);
	const nextDoors = [
		...retainedDoors,
		...nextRows.map((row) => ({
			...row,
			stepProductId: targetComponentId || row.stepProductId || null,
		})),
	];
	const totalDoors = nextDoors.reduce(
		(sum, door) => sum + Number(door.totalQty || 0),
		0,
	);
	const totalPrice = Number(
		nextDoors
			.reduce((sum, door) => sum + Number(door.lineTotal || 0), 0)
			.toFixed(2),
	);
	return {
		rows: nextRows,
		doors: nextDoors,
		totalDoors,
		totalPrice,
		linePatch: {
			housePackageTool: {
				...((input.line as any).housePackageTool || { id: null }),
				doors: nextDoors,
				totalDoors,
				totalPrice,
			},
			qty: totalDoors || (input.line as any).qty,
			lineTotal: totalPrice || (input.line as any).lineTotal,
		},
	};
}
