import {
	divideMoney,
	multiplyMoney,
	roundMoney,
	subtractMoney,
	sumMoney,
} from "../../payment-system/domain/money";
import { readSalesFormObjectMetadata } from "./metadata";

type HptDoorRow = Record<string, any>;
type HptLine = Record<string, any>;

export type HptCompatibilityContext = {
	sharedDoorSurcharge?: number | null;
	flatRate?: number | null;
	profileCoefficient?: number | null;
	salesMultiplier?: number | null;
	noHandle?: boolean;
	hasSwing?: boolean;
};

function roundCurrency(value: number) {
	return roundMoney(value);
}

function roundPersistedCurrency(value: number) {
	return roundMoney(value);
}

function toFinite(value: unknown): number | null {
	if (value == null || value === "") return null;
	const num = Number(value);
	return Number.isFinite(num) ? num : null;
}

function firstFinite(...values: unknown[]) {
	for (const value of values) {
		const num = toFinite(value);
		if (num != null) return num;
	}
	return null;
}

function normalizeTitle(value?: string | null) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

function profileAdjusted(basePrice: number, context?: HptCompatibilityContext) {
	const explicitMultiplier = toFinite(context?.salesMultiplier);
	if (explicitMultiplier != null && explicitMultiplier > 0) {
		return multiplyMoney(basePrice, explicitMultiplier);
	}
	const coefficient = toFinite(context?.profileCoefficient);
	return coefficient != null && coefficient > 0
		? divideMoney(basePrice, coefficient)
		: roundMoney(basePrice);
}

function selectedDoorQty(row: HptDoorRow, noHandle?: boolean) {
	const lhQty = Number(row?.lhQty || 0);
	const rhQty = Number(row?.rhQty || 0);
	const totalQty = Number(row?.totalQty || 0);
	if (noHandle) return totalQty || lhQty + rhQty;
	return lhQty + rhQty > 0 ? lhQty + rhQty : totalQty;
}

export function computeHptSharedDoorSurcharge(
	line: HptLine | null | undefined,
) {
	return sumMoney(
		(line?.formSteps || [])
			.filter((step: any) => {
				const title = normalizeTitle(step?.step?.title);
				return (
					title &&
					title !== "item type" &&
					title !== "door" &&
					title !== "house package tool" &&
					title !== "hpt"
				);
			})
			.map((step: any) => resolveStepSalesPrice(step)),
	);
}

function resolveStepSalesPrice(step: Record<string, unknown>) {
	const meta = readSalesFormObjectMetadata(step?.meta) || {};
	const selectedComponents = Array.isArray(meta.selectedComponents)
		? meta.selectedComponents
		: [];
	const selectedComponentPrices = selectedComponents.map((component) => {
		const record =
			component && typeof component === "object"
				? (component as Record<string, unknown>)
				: {};
		return firstFinite(record.salesPrice, record.price, record.basePrice);
	});
	if (selectedComponentPrices.some((price: number | null) => price != null)) {
		return sumMoney(
			selectedComponentPrices.map((price: number | null) => price ?? 0),
		);
	}
	return firstFinite(step?.price, step?.salesPrice, step?.basePrice) ?? 0;
}

export function computeHptFlatRate(line: HptLine | null | undefined) {
	return sumMoney(
		(line?.formSteps || []).map((step: any) => {
			const meta = readSalesFormObjectMetadata(step?.meta);
			return Number(meta?.flatRate || 0);
		}),
	);
}

export function getHptDoorSalesUnitPrice(
	row: HptDoorRow | null | undefined,
	context?: HptCompatibilityContext,
) {
	if (!row) return 0;
	const meta = readSalesFormObjectMetadata(row?.meta) || {};
	const sharedDoorSurcharge = Number(
		context?.sharedDoorSurcharge ?? meta.sharedDoorSurcharge ?? 0,
	);
	const flatRate = Number(context?.flatRate ?? meta.flatRate ?? 0);
	const addon =
		firstFinite(row?.addon, meta?.addon, row?.doorPrice, meta?.doorPrice) ?? 0;
	const unitPrice = firstFinite(row?.unitPrice);
	const baseUnitPrice = firstFinite(
		meta?.baseUnitPrice,
		row?.baseUnitPrice,
		meta?.basePrice,
		meta?.priceData?.baseUnitCost,
		meta?.priceData?.basePrice,
	);
	const inferredFromUnit =
		unitPrice == null
			? null
			: Math.max(
					0,
					subtractMoney(unitPrice, sharedDoorSurcharge, flatRate, addon),
				);
	const derivedFromBase =
		baseUnitPrice != null && baseUnitPrice > 0
			? profileAdjusted(baseUnitPrice, context)
			: null;
	return roundCurrency(
		firstFinite(
			meta?.doorSalesUnitPrice,
			derivedFromBase,
			row?.jambSizePrice && Number(row.jambSizePrice) > 0
				? row.jambSizePrice
				: null,
			meta?.jambSizePrice,
			meta?.itemPrice?.salesPrice,
			meta?.salesPrice,
			inferredFromUnit,
			row?.jambSizePrice,
			baseUnitPrice != null ? profileAdjusted(baseUnitPrice, context) : null,
			row?.salesPrice,
			row?.basePrice,
			0,
		) || 0,
	);
}

export function resolveHptDoorUnitPriceBreakdown(
	row: HptDoorRow | null | undefined,
	context?: HptCompatibilityContext,
) {
	if (!row) {
		return {
			doorSalesUnitPrice: 0,
			sharedDoorSurcharge: 0,
			flatRate: 0,
			addon: 0,
			customPrice: null,
			calculatedFinalUnitPrice: 0,
			unitPrice: 0,
			hasCustomPrice: false,
		};
	}
	const meta = readSalesFormObjectMetadata(row?.meta) || {};
	const sharedDoorSurcharge = roundCurrency(
		Number(context?.sharedDoorSurcharge ?? meta.sharedDoorSurcharge ?? 0),
	);
	const flatRate = roundCurrency(
		Number(context?.flatRate ?? meta.flatRate ?? 0),
	);
	const addon = roundCurrency(
		firstFinite(row?.addon, meta?.addon, row?.doorPrice, meta?.doorPrice) ?? 0,
	);
	const customPriceRaw = firstFinite(
		row?.customPrice,
		meta?.overridePrice,
		meta?.customPrice,
	);
	const customPrice =
		customPriceRaw == null ? null : roundCurrency(customPriceRaw);
	const doorSalesUnitPrice = getHptDoorSalesUnitPrice(row, {
		...context,
		sharedDoorSurcharge,
		flatRate,
	});
	const calculatedFinalUnitPrice = sumMoney([
		doorSalesUnitPrice,
		sharedDoorSurcharge,
		flatRate,
		addon,
	]);
	const unitPrice =
		customPrice == null ? calculatedFinalUnitPrice : customPrice;

	return {
		doorSalesUnitPrice,
		sharedDoorSurcharge,
		flatRate,
		addon,
		customPrice,
		calculatedFinalUnitPrice,
		unitPrice,
		hasCustomPrice: customPrice != null,
	};
}

export function normalizeHptDoorRowForLegacy<T extends HptDoorRow>(
	row: T,
	context?: HptCompatibilityContext,
): T & HptDoorRow {
	const meta = readSalesFormObjectMetadata(row?.meta) || {};
	const noHandle = !!context?.noHandle;
	const hasSwing = context?.hasSwing !== false;
	const totalQty = selectedDoorQty(row, noHandle);
	const baseUnitPrice = firstFinite(
		meta?.baseUnitPrice,
		row?.baseUnitPrice,
		meta?.basePrice,
		meta?.priceData?.baseUnitCost,
		meta?.priceData?.basePrice,
	);
	const unitBreakdown = resolveHptDoorUnitPriceBreakdown(row, context);
	const lineTotal = multiplyMoney(totalQty, unitBreakdown.unitPrice);
	const priceMissing = Boolean(meta?.priceMissing);

	return {
		...row,
		swing: hasSwing ? row?.swing || "" : "",
		lhQty: noHandle ? 0 : Number(row?.lhQty || 0),
		rhQty: noHandle ? 0 : Number(row?.rhQty || 0),
		totalQty,
		addon: unitBreakdown.addon,
		customPrice: unitBreakdown.customPrice,
		doorPrice: unitBreakdown.addon,
		jambSizePrice: unitBreakdown.doorSalesUnitPrice,
		unitPrice: unitBreakdown.unitPrice,
		lineTotal,
		meta: {
			...meta,
			...(baseUnitPrice == null ? {} : { baseUnitPrice }),
			doorSalesUnitPrice: unitBreakdown.doorSalesUnitPrice,
			sharedDoorSurcharge: unitBreakdown.sharedDoorSurcharge,
			flatRate: unitBreakdown.flatRate,
			overridePrice: unitBreakdown.customPrice,
			customPrice: unitBreakdown.customPrice,
			calculatedFinalUnitPrice: unitBreakdown.calculatedFinalUnitPrice,
			finalUnitPrice: unitBreakdown.unitPrice,
			priceMissing,
		},
	} as T & HptDoorRow;
}

export function hydrateHptDoorRowFromLegacy<T extends HptDoorRow>(
	door: T,
	context?: HptCompatibilityContext,
): T & HptDoorRow {
	const meta = readSalesFormObjectMetadata(door?.meta) || {};
	const sharedDoorSurcharge = roundCurrency(
		Number(context?.sharedDoorSurcharge ?? 0),
	);
	const flatRate = roundCurrency(Number(context?.flatRate ?? 0));
	const addon = firstFinite(door?.doorPrice, door?.addon, meta?.addon) ?? 0;
	const persistedFinalUnitPrice = firstFinite(door?.unitPrice);
	const normalizedPersistedFinalUnitPrice =
		persistedFinalUnitPrice == null
			? null
			: roundPersistedCurrency(persistedFinalUnitPrice);
	const inferredPersistedDoorPrice =
		normalizedPersistedFinalUnitPrice != null &&
		normalizedPersistedFinalUnitPrice > 0
			? Math.max(
					0,
					subtractMoney(
						normalizedPersistedFinalUnitPrice,
						sharedDoorSurcharge,
						flatRate,
						addon,
					),
				)
			: null;
	const doorSalesUnitPrice =
		firstFinite(
			inferredPersistedDoorPrice,
			door?.jambSizePrice,
			meta?.doorSalesUnitPrice,
		) ?? 0;
	return normalizeHptDoorRowForLegacy(
		{
			...door,
			addon,
			meta: {
				...meta,
				doorSalesUnitPrice,
				jambSizePrice: doorSalesUnitPrice,
				addon,
			},
		},
		context,
	);
}

export function hydrateHptLineFromLegacy<T extends HptLine>(
	line: T,
	context?: HptCompatibilityContext,
): T & HptLine {
	const hpt = line?.housePackageTool;
	const doors = Array.isArray(hpt?.doors) ? hpt.doors : [];
	if (!hpt || !doors.length) return line;
	const sharedDoorSurcharge = roundCurrency(
		Number(context?.sharedDoorSurcharge ?? computeHptSharedDoorSurcharge(line)),
	);
	const flatRate = roundCurrency(
		Number(context?.flatRate ?? computeHptFlatRate(line)),
	);
	const hydratedDoors = doors.map((door: HptDoorRow) =>
		hydrateHptDoorRowFromLegacy(door, {
			...context,
			sharedDoorSurcharge,
			flatRate,
		}),
	);
	const persistedLineTotal = firstFinite(line?.lineTotal);
	const hydratedLineTotal = sumMoney(
		hydratedDoors.map((door: HptDoorRow) => Number(door?.lineTotal || 0)),
	);
	const reconciliationDelta =
		persistedLineTotal == null
			? 0
			: subtractMoney(
					roundPersistedCurrency(persistedLineTotal),
					hydratedLineTotal,
				);
	const reconciledDoors =
		Math.abs(reconciliationDelta) > 0 && Math.abs(reconciliationDelta) <= 0.02
			? hydratedDoors.map((door: HptDoorRow, index: number) => {
					if (index !== hydratedDoors.length - 1) return door;
					const totalQty = Number(door?.totalQty || 0);
					if (totalQty <= 0) return door;
					const meta = readSalesFormObjectMetadata(door?.meta) || {};
					const addon =
						firstFinite(door?.addon, door?.doorPrice, meta?.addon) ?? 0;
					const lineTotal = sumMoney([
						Number(door?.lineTotal || 0),
						reconciliationDelta,
					]);
					const unitPrice = divideMoney(lineTotal, totalQty);
					const doorSalesUnitPrice = Math.max(
						0,
						subtractMoney(unitPrice, sharedDoorSurcharge, flatRate, addon),
					);
					return {
						...door,
						jambSizePrice: doorSalesUnitPrice,
						unitPrice,
						lineTotal,
						meta: {
							...meta,
							doorSalesUnitPrice,
							finalUnitPrice: unitPrice,
						},
					};
				})
			: hydratedDoors;
	return recalculateHptLineTotals({
		...line,
		housePackageTool: {
			...hpt,
			doors: reconciledDoors,
		},
	} as T & HptLine);
}

export function recalculateHptLineTotals<T extends HptLine>(
	line: T,
): T & HptLine {
	const doors = Array.isArray(line?.housePackageTool?.doors)
		? line.housePackageTool.doors
		: [];
	if (!doors.length) return line;
	const totalDoors = doors.reduce(
		(sum: number, door: HptDoorRow) => sum + Number(door?.totalQty || 0),
		0,
	);
	const totalPrice = sumMoney(
		doors.map((door: HptDoorRow) => Number(door?.lineTotal || 0)),
	);
	const unitPrice = totalDoors > 0 ? divideMoney(totalPrice, totalDoors) : 0;
	return {
		...line,
		qty: totalDoors,
		unitPrice,
		lineTotal: totalPrice,
		housePackageTool: {
			...(line.housePackageTool || { id: null }),
			doors,
			totalDoors,
			totalPrice,
		},
	} as T & HptLine;
}

export function normalizeHptLineForLegacy<T extends HptLine>(
	line: T,
	context?: HptCompatibilityContext,
): T & HptLine {
	const hpt = line?.housePackageTool;
	const doors = Array.isArray(hpt?.doors) ? hpt.doors : [];
	if (!hpt || !doors.length) return line;
	const sharedDoorSurcharge = roundCurrency(
		Number(context?.sharedDoorSurcharge ?? computeHptSharedDoorSurcharge(line)),
	);
	const flatRate = roundCurrency(
		Number(context?.flatRate ?? computeHptFlatRate(line)),
	);
	const normalizedDoors = doors.map((door: HptDoorRow) =>
		normalizeHptDoorRowForLegacy(door, {
			...context,
			sharedDoorSurcharge,
			flatRate,
		}),
	);
	return recalculateHptLineTotals({
		...line,
		housePackageTool: {
			...hpt,
			doors: normalizedDoors,
		},
	} as T & HptLine);
}
