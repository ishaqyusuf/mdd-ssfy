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
import {
	applySharedDoorSurcharge,
	clearUnpricedDoorRowQty,
	isDoorRowPriceMissing,
} from "./door-utils";
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
import { divideMoney, sumMoney } from "../../../payment-system/domain/money";

type LinePatch = Record<string, unknown>;

function selectedDoorQty(row: DoorStoredRow) {
	const lhQty = Number(row?.lhQty || 0);
	const rhQty = Number(row?.rhQty || 0);
	const totalQty = Number(row?.totalQty || 0);
	return lhQty + rhQty > 0 ? lhQty + rhQty : totalQty;
}

function removeSelectedUnpricedDoorRows(rows: DoorStoredRow[]) {
	return rows
		.filter((row) => selectedDoorQty(row) <= 0 || !isDoorRowPriceMissing(row))
		.map(clearUnpricedDoorRowQty);
}

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
	const sharedComponentPrice = sharedMouldingComponentPrice(
		getWorkflowSteps(line),
	);
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
		totalAmount: sumMoney(rows.map((row) => Number(row.lineTotal || 0))),
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
			...readLineMeta(input.line.meta),
			mouldingRows: next.storedRows,
			rateRoundingAdjustment: next.rateRoundingAdjustment,
			totalAuthoritative: next.totalAuthoritative,
		},
		qty: next.qtyTotal,
		lineTotal: next.total,
		unitPrice: next.unitPrice,
	};
}

export function buildWorkflowServiceRowsContext(
	line: WorkflowLineItemRecord,
): WorkflowServiceRowsContext {
	const lineMeta = readLineMeta(line.meta) as {
		taxxable?: boolean;
		produceable?: boolean;
	};
	return {
		rows: deriveServiceRows({
			lineUid: String(line.uid || ""),
			existingRows: getStoredServiceRows(line),
			lineDescription: line.description,
			lineQty: line.qty,
			lineUnitPrice: line.unitPrice,
			lineTaxxable: Boolean(lineMeta?.taxxable),
			lineProduceable: Boolean(lineMeta?.produceable),
		}),
	};
}

export function buildWorkflowServiceRowsPatch(input: {
	line: WorkflowLineItemRecord;
	rows: ServiceRow[];
	syncDescription?: boolean;
}) {
	const next = summarizeServiceRows(String(input.line.uid || ""), input.rows);
	return {
		meta: {
			...readLineMeta(input.line.meta),
			serviceRows: next.rows,
			taxxable: next.taxxable,
			produceable: next.produceable,
			rateRoundingAdjustment: next.rateRoundingAdjustment,
			totalAuthoritative: next.totalAuthoritative,
		},
		taxxable: next.taxxable,
		qty: next.qtyTotal,
		unitPrice: next.unitPrice,
		lineTotal: next.lineTotal,
		...(input.syncDescription === false
			? {}
			: { description: next.description }),
	};
}

function readLineMeta(value: unknown): Record<string, unknown> {
	if (!value) return {};
	if (typeof value === "string") {
		try {
			return readLineMeta(JSON.parse(value));
		} catch {
			return {};
		}
	}
	return typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export function buildWorkflowShelfSectionsContext(
	line: WorkflowLineItemRecord,
	profileCoefficient?: number | null,
): WorkflowShelfSectionsContext {
	return {
		sections: buildShelfSections(
			(line.shelfItems || []) as unknown[],
			profileCoefficient,
		) as ShelfSectionDraft[],
	};
}

export function buildWorkflowShelfSectionsPatch(input: {
	line: WorkflowLineItemRecord;
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
			meta: {
				...readLineMeta(input.line.meta),
				rateRoundingAdjustment: next.rateRoundingAdjustment,
				totalAuthoritative: next.totalAuthoritative,
			},
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
	const safeRows = removeSelectedUnpricedDoorRows(input.rows);
	const normalizedRows = applySharedDoorSurcharge(
		safeRows,
		Number(input.sharedDoorSurcharge || 0),
		input.profileCoefficient,
		{
			noHandle: !!input.noHandle,
			hasSwing: input.hasSwing !== false,
		},
	);
	const next = summarizeDoors(normalizedRows, {
		noHandle: !!input.noHandle,
		hasSwing: input.hasSwing !== false,
	});
	const unitPrice =
		next.totalDoors > 0 ? divideMoney(next.totalPrice, next.totalDoors) : 0;
	return {
		rows: next.rows,
		totalDoors: next.totalDoors,
		totalPrice: next.totalPrice,
		linePatch: {
			housePackageTool: {
				...(input.line.housePackageTool || { id: null }),
				doors: next.rows,
				totalDoors: next.totalDoors,
				totalPrice: next.totalPrice,
			},
			qty: next.totalDoors,
			unitPrice,
			lineTotal: next.totalPrice,
		},
	};
}

export function buildWorkflowDoorSizeVariantPatch(input: {
	line: WorkflowLineItemRecord;
	componentId?: number | null;
	rows: DoorStoredRow[];
	sharedDoorSurcharge?: number | null;
	noHandle?: boolean;
	hasSwing?: boolean;
	profileCoefficient?: number | null;
}) {
	const existingDoors = Array.isArray(input.line.housePackageTool?.doors)
		? input.line.housePackageTool.doors || []
		: [];
	const targetComponentId = Number(input.componentId || 0);
	const retainedDoors = existingDoors.filter(
		(door) => Number(door.stepProductId || 0) !== targetComponentId,
	);
	const safeRows = removeSelectedUnpricedDoorRows(input.rows);
	const nextRows = applySharedDoorSurcharge(
		safeRows,
		Number(input.sharedDoorSurcharge || 0),
		input.profileCoefficient,
		{
			noHandle: !!input.noHandle,
			hasSwing: input.hasSwing !== false,
		},
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
	const totalPrice = sumMoney(
		nextDoors.map((door) => Number(door.lineTotal || 0)),
	);
	const unitPrice = totalDoors > 0 ? divideMoney(totalPrice, totalDoors) : 0;
	return {
		rows: nextRows,
		doors: nextDoors,
		totalDoors,
		totalPrice,
		linePatch: {
			housePackageTool: {
				...(input.line.housePackageTool || { id: null }),
				doors: nextDoors,
				totalDoors,
				totalPrice,
			},
			qty: totalDoors,
			unitPrice,
			lineTotal: totalPrice,
		},
	};
}
