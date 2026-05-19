import {
	findLineStepByTitle,
	flattenShelfSections,
	getRouteConfigForLine,
	getSelectedDoorComponentsForLine,
	isShelfItem,
	summarizeDoors,
	summarizeShelfRows,
} from "../../domain";
import {
	applySharedDoorSurcharge,
	computeSharedDoorSurcharge,
	normalizeStoredDoorRows,
} from "./door-utils";
import {
	createShelfSectionDraft,
	type DoorStoredRow,
	type ShelfRowDraft,
	type WorkflowComponentRecord,
	type WorkflowLineItemRecord,
} from "./workflow-records";

type LinePatch = Record<string, unknown>;

export type WorkflowShelfSyncPatch = {
	lineUid: string;
	rows: ShelfRowDraft[];
	qty: number;
	unitPrice: number;
	lineTotal: number;
	changed: {
		rowsChanged: boolean;
		qtyChanged: boolean;
		unitPriceChanged: boolean;
		totalChanged: boolean;
	};
	linePatch: LinePatch;
};

export type WorkflowDoorSyncPatch = {
	lineUid: string;
	rows: DoorStoredRow[];
	totalDoors: number;
	totalPrice: number;
	linePatch: LinePatch;
};

function roundCurrency(value: unknown) {
	return Number(Number(value || 0).toFixed(2));
}

function getShelfRows(line: WorkflowLineItemRecord | null | undefined) {
	const rows = (line as any)?.shelfItems;
	return Array.isArray(rows) ? rows : [];
}

function getDoorRows(line: WorkflowLineItemRecord | null | undefined) {
	const rows = (line as any)?.housePackageTool?.doors;
	return Array.isArray(rows) ? (rows as DoorStoredRow[]) : [];
}

export function buildWorkflowShelfSyncPatch(
	line: WorkflowLineItemRecord | null | undefined,
	profileCoefficient?: number | null,
): WorkflowShelfSyncPatch | null {
	if (!line || !isShelfItem(line)) return null;
	const currentRows = getShelfRows(line);
	if (!currentRows.length) return null;

	const summary = summarizeShelfRows(currentRows, profileCoefficient);
	const rowsChanged =
		JSON.stringify(currentRows) !== JSON.stringify(summary.rows);
	const qtyChanged =
		Number((line as any).qty || 0) !== Number(summary.qtyTotal || 0);
	const unitPriceChanged =
		roundCurrency((line as any).unitPrice) !== roundCurrency(summary.unitPrice);
	const totalChanged =
		roundCurrency((line as any).lineTotal) !== roundCurrency(summary.lineTotal);

	if (!rowsChanged && !qtyChanged && !unitPriceChanged && !totalChanged) {
		return null;
	}

	return {
		lineUid: String(line.uid || ""),
		rows: summary.rows,
		qty: summary.qtyTotal,
		unitPrice: summary.unitPrice,
		lineTotal: summary.lineTotal,
		changed: {
			rowsChanged,
			qtyChanged,
			unitPriceChanged,
			totalChanged,
		},
		linePatch: {
			shelfItems: summary.rows,
			qty: summary.qtyTotal,
			unitPrice: summary.unitPrice,
			lineTotal: summary.lineTotal,
		},
	};
}

export function buildInitialWorkflowShelfPatch(
	line: WorkflowLineItemRecord | null | undefined,
	profileCoefficient?: number | null,
): WorkflowShelfSyncPatch | null {
	if (!line || !isShelfItem(line)) return null;
	if (getShelfRows(line).length > 0) return null;

	const initialRows = flattenShelfSections(
		[createShelfSectionDraft()],
		profileCoefficient,
	);
	const summary = summarizeShelfRows(initialRows, profileCoefficient);

	return {
		lineUid: String(line.uid || ""),
		rows: summary.rows,
		qty: summary.qtyTotal,
		unitPrice: summary.unitPrice,
		lineTotal: summary.lineTotal,
		changed: {
			rowsChanged: true,
			qtyChanged: Number((line as any).qty || 0) !== Number(summary.qtyTotal || 0),
			unitPriceChanged:
				roundCurrency((line as any).unitPrice) !== roundCurrency(summary.unitPrice),
			totalChanged:
				roundCurrency((line as any).lineTotal) !== roundCurrency(summary.lineTotal),
		},
		linePatch: {
			shelfItems: summary.rows,
			qty: summary.qtyTotal,
			unitPrice: summary.unitPrice,
			lineTotal: summary.lineTotal,
		},
	};
}

export function buildWorkflowDoorSyncPatch(input: {
	line: WorkflowLineItemRecord | null | undefined;
	routeData?: unknown;
	availableComponents?: WorkflowComponentRecord[] | null;
	activeDoorUid?: string | null;
	profileCoefficient?: number | null;
}): WorkflowDoorSyncPatch | null {
	const { line, routeData, availableComponents, activeDoorUid, profileCoefficient } =
		input;
	if (!line) return null;

	const storedDoors = getDoorRows(line);
	if (!storedDoors.length) return null;

	const selectedDoorComponents = getSelectedDoorComponentsForLine(line, {
		availableComponents,
	}) as WorkflowComponentRecord[];
	if (!selectedDoorComponents.length) return null;

	const activeComponentUid =
		String(activeDoorUid || "").trim() ||
		String(selectedDoorComponents[0]?.uid || "");
	const activeDoorComponent =
		selectedDoorComponents.find(
			(component) => String(component?.uid || "") === activeComponentUid,
		) ||
		selectedDoorComponents[0] ||
		null;
	const routeConfig = getRouteConfigForLine({
		routeData,
		line,
		step: findLineStepByTitle(line, "House Package Tool"),
		component: activeDoorComponent,
	});
	const normalizedRows = applySharedDoorSurcharge(
		storedDoors,
		computeSharedDoorSurcharge(line as any),
		profileCoefficient,
	);
	const summary = summarizeDoors(normalizedRows, {
		noHandle: !!routeConfig?.noHandle,
		hasSwing: !!routeConfig?.hasSwing,
	});
	const rowsChanged =
		JSON.stringify(normalizeStoredDoorRows(storedDoors)) !==
		JSON.stringify(normalizeStoredDoorRows(summary.rows));
	const qtyChanged =
		Number((line as any).qty || 0) !== Number(summary.totalDoors || 0);
	const totalChanged =
		roundCurrency((line as any).lineTotal) !== roundCurrency(summary.totalPrice);
	if (!rowsChanged && !qtyChanged && !totalChanged) return null;

	return {
		lineUid: String(line.uid || ""),
		rows: summary.rows,
		totalDoors: summary.totalDoors,
		totalPrice: summary.totalPrice,
		linePatch: {
			housePackageTool: {
				...((line as any).housePackageTool || { id: null }),
				doors: summary.rows,
				totalDoors: summary.totalDoors,
				totalPrice: summary.totalPrice,
			},
			qty: summary.totalDoors,
			lineTotal: summary.totalPrice,
		},
	};
}
