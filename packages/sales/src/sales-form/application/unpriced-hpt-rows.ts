import { divideMoney, sumMoney } from "../../payment-system/domain/money";
import { readSalesFormObjectMetadata } from "../domain";
import {
	type SalesFormExtraCostRecord,
	type SalesFormLineItemRecord,
	computeSalesFormSummary,
} from "./record-normalization";

export type SalesFormRecordWithLines = {
	lineItems?: SalesFormLineItemRecord[];
	extraCosts?: SalesFormExtraCostRecord[];
	form?: { paymentMethod?: string | null; [key: string]: unknown } | null;
	settings?: { cccPercentage?: number | null; [key: string]: unknown } | null;
	summary?: { taxRate?: number | null; [key: string]: unknown } | null;
};

export type UnpricedHptPersistenceDecision<
	TRecord extends SalesFormRecordWithLines,
	TAction,
> = {
	action: TAction;
	record: TRecord;
	issues: UnpricedHptSizeRowIssue[];
	requiresConfirmation: boolean;
};

type HptDoorRow = Record<string, unknown> & {
	dimension?: string | null;
	lhQty?: number | null;
	rhQty?: number | null;
	totalQty?: number | null;
	lineTotal?: number | null;
	meta?: unknown;
};

export type UnpricedHptSizeRowIssue = {
	lineUid: string;
	lineTitle: string;
	componentTitle: string;
	size: string;
	lhQty: number;
	rhQty: number;
	quantity: number;
};

function selectedDoorQty(row: HptDoorRow) {
	const lhQty = Number(row.lhQty || 0);
	const rhQty = Number(row.rhQty || 0);
	return lhQty + rhQty || Number(row.totalQty || 0);
}

function isQuantityBearingUnpricedRow(row: HptDoorRow) {
	const meta = readSalesFormObjectMetadata(row.meta) || {};
	return Boolean(meta.priceMissing) && selectedDoorQty(row) > 0;
}

export function findQuantityBearingUnpricedHptRows(
	record?: SalesFormRecordWithLines | null,
): UnpricedHptSizeRowIssue[] {
	const issues: UnpricedHptSizeRowIssue[] = [];
	for (const line of record?.lineItems || []) {
		const rows = Array.isArray(line.housePackageTool?.doors)
			? (line.housePackageTool.doors as HptDoorRow[])
			: [];
		for (const row of rows) {
			if (!isQuantityBearingUnpricedRow(row)) continue;
			const meta = readSalesFormObjectMetadata(row.meta) || {};
			const lhQty = Number(row.lhQty || 0);
			const rhQty = Number(row.rhQty || 0);
			issues.push({
				lineUid: String(line.uid || ""),
				lineTitle: String(line.title || "Line item"),
				componentTitle: String(meta.componentTitle || "Door"),
				size: String(row.dimension || "Unknown size"),
				lhQty,
				rhQty,
				quantity: selectedDoorQty(row),
			});
		}
	}
	return issues;
}

export function hasQuantityBearingUnpricedHptRows(
	record?: SalesFormRecordWithLines | null,
) {
	return findQuantityBearingUnpricedHptRows(record).length > 0;
}

export function removeQuantityBearingUnpricedHptRows<
	TRecord extends SalesFormRecordWithLines,
>(record: TRecord): TRecord {
	const lineItems = (record.lineItems || []).map((line) => {
		const rows = Array.isArray(line.housePackageTool?.doors)
			? (line.housePackageTool.doors as HptDoorRow[])
			: null;
		if (!rows?.some(isQuantityBearingUnpricedRow)) return line;
		const doors = rows.filter((row) => !isQuantityBearingUnpricedRow(row));
		const totalDoors = doors.reduce(
			(sum, row) => sum + selectedDoorQty(row),
			0,
		);
		const totalPrice = sumMoney(doors.map((row) => Number(row.lineTotal || 0)));
		return {
			...line,
			housePackageTool: {
				...line.housePackageTool,
				doors,
				totalDoors,
				totalPrice,
			},
			qty: totalDoors,
			unitPrice: totalDoors > 0 ? divideMoney(totalPrice, totalDoors) : 0,
			lineTotal: totalPrice,
		};
	});
	const summary = computeSalesFormSummary(
		lineItems,
		Number(record.summary?.taxRate || 0),
		record.extraCosts || [],
		record.form?.paymentMethod,
		record.settings?.cccPercentage,
	);
	return {
		...record,
		lineItems,
		summary: { ...record.summary, ...summary },
	} as TRecord;
}

export function resolveUnpricedHptPersistence<
	TRecord extends SalesFormRecordWithLines,
	TAction,
>(
	record: TRecord,
	action: TAction,
	confirmRemoval = false,
): UnpricedHptPersistenceDecision<TRecord, TAction> {
	const issues = findQuantityBearingUnpricedHptRows(record);
	return {
		action,
		issues,
		requiresConfirmation: issues.length > 0 && !confirmRemoval,
		record:
			issues.length > 0 && confirmRemoval
				? removeQuantityBearingUnpricedHptRows(record)
				: record,
	};
}
