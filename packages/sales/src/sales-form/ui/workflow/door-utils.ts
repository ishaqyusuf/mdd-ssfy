"use client";

import {
	deriveDoorSizeCandidates,
	getSelectedDoorComponentsForLine,
	hasDoorSizeVariationConfig,
	normalizeHptDoorRowForLegacy,
	readSalesFormObjectMetadata,
	resolveDoorTierPricing,
} from "../../domain";
import type { SalesFormLineItemRecord } from "../../application";
import { profileAdjustedDoorSalesPrice } from "./door-pricing";

type WorkflowStep = NonNullable<SalesFormLineItemRecord["formSteps"]>[number];

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

type DoorLine = {
	formSteps?: SalesFormLineItemRecord["formSteps"] | null;
	housePackageTool?: SalesFormLineItemRecord["housePackageTool"] | null;
};

type DoorSizeComponent = {
	id?: number | null;
	uid?: string | null;
	stepId?: number | null;
	title?: string | null;
	salesPrice?: number | null;
	basePrice?: number | null;
	pricing?: Record<string, unknown> | null;
	supplierVariants?: unknown[];
};

function toDoorNumber(value: unknown, fallback = 0) {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
}

function firstFiniteDoorNumber(...values: Array<number | null | undefined>) {
	for (const value of values) {
		const candidate = Number(value);
		if (Number.isFinite(candidate)) return candidate;
	}
	return null;
}

function readDoorRowMeta(row?: DoorRow | null) {
	return readSalesFormObjectMetadata(row?.meta) || {};
}

export function isDoorRowPriceMissing(row?: DoorRow | null) {
	return Boolean(readDoorRowMeta(row).priceMissing);
}

export function clearUnpricedDoorRowQty<T extends DoorRow>(row: T): T {
	if (!isDoorRowPriceMissing(row)) return row;
	return {
		...row,
		lhQty: 0,
		rhQty: 0,
		totalQty: 0,
		lineTotal: 0,
		meta: {
			...readDoorRowMeta(row),
			priceMissing: true,
		},
	};
}

function hasConfiguredDoorRowPrice(row?: DoorRow | null) {
	if (!row || isDoorRowPriceMissing(row)) return false;
	return readDoorRowMeta(row).baseUnitPrice != null;
}

export function calcWorkflowDoorRow<T extends DoorRow>(row: T): T {
	const lhQty = toDoorNumber(row.lhQty, 0);
	const rhQty = toDoorNumber(row.rhQty, 0);
	const totalInput = toDoorNumber(row.totalQty, 0);
	const unitPrice = toDoorNumber(row.unitPrice, 0);
	const totalQty = lhQty + rhQty > 0 ? lhQty + rhQty : totalInput;
	return {
		...row,
		lhQty,
		rhQty,
		unitPrice,
		totalQty,
		lineTotal: Number((totalQty * unitPrice).toFixed(2)),
	};
}

function blankWorkflowDoorRow(): DoorRow {
	return {
		id: null,
		dimension: "",
		swing: "",
		doorType: "",
		doorPrice: 0,
		jambSizePrice: 0,
		casingPrice: 0,
		unitPrice: 0,
		lhQty: 0,
		rhQty: 0,
		totalQty: 0,
		lineTotal: 0,
		stepProductId: null,
		meta: {},
	};
}

export function rowsForDoorComponent(
	line: SalesFormLineItemRecord,
	componentId: number | null,
) {
	return (line.housePackageTool?.doors || [])
		.filter(
			(door) => Number(door.stepProductId || 0) === Number(componentId || 0),
		)
		.map((door) => calcWorkflowDoorRow(door as DoorRow));
}

export function deriveDoorSizeRows({
	line,
	existingRows,
	component,
	routeData,
	supplierUid,
	profileCoefficient,
}: {
	line: SalesFormLineItemRecord;
	existingRows: DoorRow[];
	component: DoorSizeComponent | null;
	routeData?: any;
	supplierUid?: string | null;
	profileCoefficient?: number | null;
}) {
	const bySize = new Map<string, DoorRow>();
	existingRows.forEach((row) => {
		if (row.dimension) bySize.set(String(row.dimension).trim(), row);
	});
	const pricing = component?.pricing || {};
	const usesVariantFiltering = hasDoorSizeVariationConfig(line, routeData);
	const candidateSizes = deriveDoorSizeCandidates(line, pricing, routeData);
	if (!candidateSizes.length) {
		if (existingRows.length && !usesVariantFiltering) {
			return existingRows.map((row) =>
				clearUnpricedDoorRowQty(calcWorkflowDoorRow(row)),
			);
		}
		if (usesVariantFiltering) return [];
		const fallbackBase =
			firstFiniteDoorNumber(component?.basePrice, component?.salesPrice) ?? 0;
		return [
			calcWorkflowDoorRow({
				...blankWorkflowDoorRow(),
				stepProductId: component?.id || null,
				jambSizePrice: profileAdjustedDoorSalesPrice(
					component?.salesPrice,
					component?.basePrice,
					profileCoefficient,
				),
				unitPrice: profileAdjustedDoorSalesPrice(
					component?.salesPrice,
					component?.basePrice,
					profileCoefficient,
				),
				meta: {
					baseUnitPrice: fallbackBase,
					doorSalesUnitPrice: profileAdjustedDoorSalesPrice(
						component?.salesPrice,
						component?.basePrice,
						profileCoefficient,
					),
					componentUid: component?.uid || null,
					componentTitle: component?.title || null,
				},
			}),
		];
	}

	return candidateSizes.map((size) => {
		const normalizedSize = String(size).trim();
		const existing = bySize.get(normalizedSize);
		const pricingPair = resolveDoorTierPricing({
			pricing,
			size: normalizedSize,
			supplierUid,
			supplierVariants: component?.supplierVariants || [],
			salesMultiplier:
				Number.isFinite(Number(profileCoefficient || 0)) &&
				Number(profileCoefficient || 0) > 0
					? Number((1 / Number(profileCoefficient || 0)).toFixed(2))
					: 1,
			fallbackSalesPrice: component?.salesPrice,
			fallbackBasePrice: component?.basePrice,
		});
		const existingHasConfiguredPrice = hasConfiguredDoorRowPrice(existing);
		const existingMeta = readDoorRowMeta(existing);
		const existingBaseUnit = existingHasConfiguredPrice
			? firstFiniteDoorNumber(existingMeta.baseUnitPrice)
			: null;
		const hasResolvedPrice = Boolean(
			pricingPair.hasPrice || existingHasConfiguredPrice,
		);
		const rowBaseUnit = firstFiniteDoorNumber(
			existingBaseUnit,
			hasResolvedPrice ? pricingPair.basePrice : null,
			hasResolvedPrice ? component?.basePrice : null,
			hasResolvedPrice ? component?.salesPrice : null,
		);
		const unitPrice = existing
			? firstFiniteDoorNumber(existing.unitPrice, 0) || 0
			: hasResolvedPrice
				? (firstFiniteDoorNumber(
						profileAdjustedDoorSalesPrice(
							pricingPair.salesPrice,
							pricingPair.basePrice,
							profileCoefficient,
						),
						component?.salesPrice,
						component?.basePrice,
					) ?? 0)
				: 0;
		return clearUnpricedDoorRowQty(
			calcWorkflowDoorRow({
				...(existing || blankWorkflowDoorRow()),
				dimension: normalizedSize,
				stepProductId: component?.id || existing?.stepProductId || null,
				jambSizePrice: unitPrice,
				unitPrice,
				meta: {
					...existingMeta,
					priceMissing: !hasResolvedPrice,
					baseUnitPrice: rowBaseUnit ?? 0,
					doorSalesUnitPrice: unitPrice,
					componentUid: existingMeta.componentUid ?? component?.uid ?? null,
					componentTitle:
						existingMeta.componentTitle ?? component?.title ?? null,
				},
			}),
		);
	});
}

export function getDoorSupplierMeta(step?: WorkflowStepWithMeta | null) {
	const meta = readSalesFormObjectMetadata(step?.meta) || {};
	const formStepMeta = readSalesFormObjectMetadata(meta?.formStepMeta) || {};
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
	options?: {
		noHandle?: boolean;
		hasSwing?: boolean;
	},
) {
	return rows.map((row) => {
		if (isDoorRowPriceMissing(row)) {
			return clearUnpricedDoorRowQty({
				...row,
				unitPrice: 0,
			});
		}
		return clearUnpricedDoorRowQty({
			...normalizeHptDoorRowForLegacy(row, {
				sharedDoorSurcharge: surcharge,
				profileCoefficient,
				noHandle: options?.noHandle,
				hasSwing: options?.hasSwing,
			}),
		});
	});
}

export function normalizeStoredDoorRows(rows: DoorRow[]) {
	return rows.map((row) => {
		const meta = readDoorRowMeta(row);
		return {
			id: row?.id ?? null,
			dimension: String(row?.dimension || ""),
			swing: String(row?.swing || ""),
			stepProductId: Number(row?.stepProductId || 0),
			lhQty: Number(row?.lhQty || 0),
			rhQty: Number(row?.rhQty || 0),
			totalQty: Number(row?.totalQty || 0),
			unitPrice: Number(Number(row?.unitPrice || 0).toFixed(2)),
			lineTotal: Number(Number(row?.lineTotal || 0).toFixed(2)),
			doorPrice: Number(Number(row?.doorPrice || 0).toFixed(2)),
			jambSizePrice: Number(Number(row?.jambSizePrice || 0).toFixed(2)),
			addon:
				row?.addon == null || row?.addon === ""
					? null
					: Number(Number(row.addon || 0).toFixed(2)),
			customPrice:
				row?.customPrice == null || row?.customPrice === ""
					? null
					: Number(Number(row.customPrice || 0).toFixed(2)),
			meta: {
				baseUnitPrice: Number(Number(meta.baseUnitPrice || 0).toFixed(2)),
				doorSalesUnitPrice: Number(
					Number(meta.doorSalesUnitPrice || 0).toFixed(2),
				),
				sharedDoorSurcharge: Number(
					Number(meta.sharedDoorSurcharge || 0).toFixed(2),
				),
				priceMissing: Boolean(meta.priceMissing),
			},
		};
	});
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
		const nextRow = normalizeHptDoorRowForLegacy({
			...row,
			jambSizePrice: hasResolvedPrice
				? Number((tierPricing.salesPrice || 0).toFixed(2))
				: 0,
			meta: {
				...readDoorRowMeta(row),
				baseUnitPrice,
				doorSalesUnitPrice: hasResolvedPrice
					? Number((tierPricing.salesPrice || 0).toFixed(2))
					: 0,
				priceMissing: !hasResolvedPrice,
			},
		}, {
			sharedDoorSurcharge,
			salesMultiplier,
		});
		return hasResolvedPrice
			? nextRow
			: clearUnpricedDoorRowQty({
					...nextRow,
					unitPrice: 0,
					lineTotal: 0,
				});
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
