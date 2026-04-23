"use client";

import {
	getSelectedDoorComponentsForLine,
	resolveDoorTierPricing,
} from "@gnd/sales/sales-form";

import type { NewSalesFormLineItem } from "../../schema";
import { profileAdjustedDoorSalesPrice } from "../workflow-modals";

type WorkflowStep = NonNullable<NewSalesFormLineItem["formSteps"]>[number];

type WorkflowStepWithMeta = WorkflowStep & {
	meta?: {
		formStepMeta?: {
			supplierUid?: string | null;
			supplierName?: string | null;
		} | null;
		supplierUid?: string | null;
		supplierName?: string | null;
		[key: string]: unknown;
	} | null;
	price?: number | null;
};

type DoorRow = {
	id?: number | null;
	dimension?: string | null;
	swing?: string | null;
	stepProductId?: number | null;
	lhQty?: number | null;
	rhQty?: number | null;
	totalQty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
	addon?: number | string | null;
	customPrice?: number | string | null;
	meta?: {
		baseUnitPrice?: number | null;
		priceMissing?: boolean | null;
		[key: string]: unknown;
	} | null;
	[key: string]: unknown;
};

type DoorComponent = {
	id?: number | null;
	salesPrice?: number | null;
	basePrice?: number | null;
	pricing?: Record<string, unknown> | null;
	supplierVariants?: unknown[];
	[key: string]: unknown;
};

type DoorLine = Pick<NewSalesFormLineItem, "formSteps" | "housePackageTool">;

export function getDoorSupplierMeta(step?: WorkflowStepWithMeta | null) {
	const meta = step?.meta || {};
	const formStepMeta = meta?.formStepMeta || {};
	const supplierUid = formStepMeta?.supplierUid || meta?.supplierUid || null;
	const supplierName = formStepMeta?.supplierName || meta?.supplierName || null;
	return {
		supplierUid: supplierUid ? String(supplierUid) : null,
		supplierName: supplierName ? String(supplierName) : null,
	};
}

export function computeSharedDoorSurcharge(line: DoorLine) {
	return Number(
		(line.formSteps || [])
			.filter((step) => {
				const title = String(step?.step?.title || "")
					.trim()
					.toLowerCase();
				return (
					title &&
					title !== "item type" &&
					title !== "door" &&
					title !== "house package tool" &&
					title !== "hpt"
				);
			})
			.reduce((sum, step) => sum + Number(step?.price || 0), 0)
			.toFixed(2),
	);
}

export function applySharedDoorSurcharge(
	rows: DoorRow[],
	surcharge: number,
	profileCoefficient?: number | null,
) {
	return rows.map((row) => {
		const hasStoredBasePrice = row?.meta?.baseUnitPrice != null;
		const baseUnitPrice = hasStoredBasePrice
			? Number(row.meta?.baseUnitPrice || 0)
			: null;
		const calculatedSalesUnit =
			baseUnitPrice == null
				? Math.max(0, Number(row?.unitPrice || 0) - surcharge)
				: profileAdjustedDoorSalesPrice(
						null,
						Math.max(0, baseUnitPrice),
						profileCoefficient,
					);
		const effectiveUnitPrice = Number(
			(Math.max(0, calculatedSalesUnit) + surcharge).toFixed(2),
		);
		const totalQty = Number(row?.totalQty || 0);
		return {
			...row,
			unitPrice: effectiveUnitPrice,
			lineTotal: Number((totalQty * effectiveUnitPrice).toFixed(2)),
			meta: {
				...(row?.meta || {}),
				...(baseUnitPrice == null
					? {}
					: { baseUnitPrice: Math.max(0, baseUnitPrice) }),
			},
		};
	});
}

export function normalizeStoredDoorRows(rows: DoorRow[]) {
	return rows.map((row) => ({
		id: row?.id ?? null,
		dimension: String(row?.dimension || ""),
		swing: String(row?.swing || ""),
		stepProductId: Number(row?.stepProductId || 0),
		lhQty: Number(row?.lhQty || 0),
		rhQty: Number(row?.rhQty || 0),
		totalQty: Number(row?.totalQty || 0),
		unitPrice: Number(Number(row?.unitPrice || 0).toFixed(2)),
		lineTotal: Number(Number(row?.lineTotal || 0).toFixed(2)),
		addon:
			row?.addon == null || row?.addon === ""
				? null
				: Number(Number(row.addon || 0).toFixed(2)),
		customPrice:
			row?.customPrice == null || row?.customPrice === ""
				? null
				: Number(Number(row.customPrice || 0).toFixed(2)),
		meta: {
			baseUnitPrice: Number(Number(row?.meta?.baseUnitPrice || 0).toFixed(2)),
			priceMissing: Boolean(row?.meta?.priceMissing),
		},
	}));
}

export function repricePersistedDoorRowsForSupplier(args: {
	line: DoorLine;
	nextSteps: WorkflowStep[];
	supplierUid?: string | null;
	salesMultiplier?: number | null;
}) {
	const { line, nextSteps, supplierUid, salesMultiplier } = args;
	const existingDoors = Array.isArray(line?.housePackageTool?.doors)
		? (line.housePackageTool.doors as DoorRow[])
		: [];
	if (!existingDoors.length) return null;

	const selectedDoorComponents = getSelectedDoorComponentsForLine({
		...line,
		formSteps: nextSteps,
	}) as DoorComponent[];
	if (!selectedDoorComponents.length) return null;

	const componentById = new Map<number, DoorComponent>();
	for (const component of selectedDoorComponents) {
		const componentId = Number(component?.id || 0);
		if (componentId > 0) componentById.set(componentId, component);
	}

	const sharedDoorSurcharge = computeSharedDoorSurcharge({
		...line,
		formSteps: nextSteps,
	});
	const repricedRows = existingDoors.map((row) => {
		const component = componentById.get(Number(row?.stepProductId || 0));
		const size = String(row?.dimension || "").trim();
		if (!component || !size) return row;

		const tierPricing = resolveDoorTierPricing({
			pricing: component?.pricing || {},
			size,
			supplierUid,
			supplierVariants: component?.supplierVariants || [],
			salesMultiplier,
			fallbackSalesPrice: component?.salesPrice,
			fallbackBasePrice: component?.basePrice,
		});
		const hasResolvedPrice = Boolean(tierPricing.hasPrice);
		const baseUnitPrice = hasResolvedPrice
			? Number((tierPricing.basePrice || 0).toFixed(2))
			: 0;
		const unitPrice = hasResolvedPrice
			? Number(
					(Number(tierPricing.salesPrice || 0) + sharedDoorSurcharge).toFixed(
						2,
					),
				)
			: 0;
		const totalQty = Number(row?.totalQty || 0);
		return {
			...row,
			unitPrice,
			lineTotal: Number((totalQty * unitPrice).toFixed(2)),
			meta: {
				...(row?.meta || {}),
				baseUnitPrice,
				priceMissing: !hasResolvedPrice,
			},
		};
	});

	const totalDoors = repricedRows.reduce(
		(sum, row) => sum + Number(row?.totalQty || 0),
		0,
	);
	const totalPrice = Number(
		repricedRows
			.reduce((sum, row) => sum + Number(row?.lineTotal || 0), 0)
			.toFixed(2),
	);

	return {
		doors: repricedRows,
		totalDoors,
		totalPrice,
	};
}
