import {
	summarizeDoors,
	summarizeMouldingPersistRows,
	summarizeServiceRows,
	summarizeShelfRows,
	getSelectedMouldingComponentsForLine,
	sharedMouldingComponentPrice,
} from "../../domain";
import {
	getStoredMouldingRows,
	getStoredServiceRows,
	getWorkflowSteps,
} from "./workflow-records";
import {
	multiplyMoney,
	sumMoney,
} from "../../../payment-system/domain/money";

type WorkflowLineTotalRecord = Record<string, any> & {
	uid?: string | null;
	qty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
	shelfItems?: any[] | null;
	housePackageTool?: {
		doors?: any[] | null;
		totalPrice?: number | null;
	} | null;
};

export function buildWorkflowLinePricingPatch(
	line: WorkflowLineTotalRecord,
	formSteps?: Array<{ price?: number | null } | null> | null,
) {
	if (Array.isArray(line.shelfItems) && line.shelfItems.length) return {};
	if (line.housePackageTool?.doors?.length) return {};
	if (!Array.isArray(formSteps)) return {};
	const unitPrice = sumMoney(
		formSteps.map((step) => Number(step?.price || 0)),
	);
	const qty = Number(line.qty || 0);
	return {
		unitPrice,
		lineTotal: multiplyMoney(qty, unitPrice),
	};
}

export function getWorkflowLineDisplayTotal(
	line: WorkflowLineTotalRecord,
	profileCoefficient = 1,
) {
	const hptDoors = Array.isArray(line.housePackageTool?.doors)
		? line.housePackageTool.doors
		: [];
	if (hptDoors.length) {
		const storedTotal = Number(line.housePackageTool?.totalPrice || 0);
		if (storedTotal > 0) return storedTotal;
		return summarizeDoors(hptDoors).totalPrice;
	}
	if (Array.isArray(line.shelfItems) && line.shelfItems.length) {
		return summarizeShelfRows(line.shelfItems, profileCoefficient).lineTotal;
	}
	const serviceRows = getStoredServiceRows(line);
	if (serviceRows.length) {
		return summarizeServiceRows(String(line.uid || ""), serviceRows).lineTotal;
	}
	const mouldingRows = getStoredMouldingRows(line);
	if (mouldingRows.length) {
		return summarizeMouldingPersistRows(
			mouldingRows,
			sharedMouldingComponentPrice(getWorkflowSteps(line)),
		).total;
	}
	const lineTotal = Number(line.lineTotal || 0);
	if (lineTotal > 0) return lineTotal;
	return multiplyMoney(
		Number(line.qty || 0),
		Number(line.unitPrice || 0),
	);
}
