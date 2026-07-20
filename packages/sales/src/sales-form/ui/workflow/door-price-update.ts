import { profileAdjustedDoorSalesPrice } from "./door-pricing";
import { resolveHptDoorUnitPriceBreakdown } from "../../domain/hpt-compatibility";
import {
	multiplyMoney,
	subtractMoney,
	sumMoney,
} from "../../../payment-system/domain/money";

export type DoorPriceRow = {
	dimension?: string | null;
	unitPrice?: number | null;
	lhQty?: number | null;
	rhQty?: number | null;
	totalQty?: number | null;
	lineTotal?: number | null;
	meta?: {
		baseUnitPrice?: number | null;
		doorSalesUnitPrice?: number | null;
		priceMissing?: boolean | null;
		[key: string]: unknown;
	} | null;
	[key: string]: unknown;
};

function toNumber(value: unknown, fallback = 0) {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
}

function firstFiniteNumber(...values: Array<number | null | undefined>) {
	for (const value of values) {
		const candidate = Number(value);
		if (Number.isFinite(candidate)) return candidate;
	}
	return null;
}

function calcDoorPriceRow<T extends DoorPriceRow>(row: T): T {
	const lhQty = toNumber(row.lhQty, 0);
	const rhQty = toNumber(row.rhQty, 0);
	const totalInput = toNumber(row.totalQty, 0);
	const unitPrice = toNumber(row.unitPrice, 0);
	const totalQty = lhQty + rhQty > 0 ? lhQty + rhQty : totalInput;
	return {
		...row,
		lhQty,
		rhQty,
		unitPrice,
		totalQty,
		lineTotal: multiplyMoney(totalQty, unitPrice),
	};
}

export function updateDoorRowBasePrice<T extends DoorPriceRow>(
	row: T,
	nextBase: number,
	profileCoefficient?: number | null,
) {
	const normalizedNextBase = Math.max(0, nextBase);
	const priorBase = firstFiniteNumber(row.meta?.baseUnitPrice);
	const priorCalculatedSales =
		priorBase == null
			? toNumber(row.unitPrice, 0)
			: profileAdjustedDoorSalesPrice(null, priorBase, profileCoefficient);
	const surcharge = subtractMoney(
		toNumber(row.unitPrice, 0),
		priorCalculatedSales,
	);
	const nextCalculatedSales = profileAdjustedDoorSalesPrice(
		null,
		normalizedNextBase,
		profileCoefficient,
	);
	return calcDoorPriceRow({
		...row,
		unitPrice: sumMoney([nextCalculatedSales, surcharge]),
		jambSizePrice: nextCalculatedSales,
		meta: {
			...(row.meta || {}),
			baseUnitPrice: normalizedNextBase,
			doorSalesUnitPrice: nextCalculatedSales,
			priceMissing: false,
		},
	});
}

export function patchDoorRowCustomPrice<T extends DoorPriceRow>(
	row: T,
	customPrice: number | null,
) {
	const nextRow = {
		...row,
		customPrice,
		meta: {
			...(row.meta || {}),
			customPrice,
			overridePrice: customPrice,
		},
	} as T;
	const breakdown = resolveHptDoorUnitPriceBreakdown(nextRow);
	return calcDoorPriceRow({
		...nextRow,
		unitPrice: breakdown.unitPrice,
		jambSizePrice: breakdown.doorSalesUnitPrice,
		doorPrice: breakdown.addon,
		addon: breakdown.addon,
		meta: {
			...(nextRow.meta || {}),
			doorSalesUnitPrice: breakdown.doorSalesUnitPrice,
			sharedDoorSurcharge: breakdown.sharedDoorSurcharge,
			flatRate: breakdown.flatRate,
			calculatedFinalUnitPrice: breakdown.calculatedFinalUnitPrice,
			finalUnitPrice: breakdown.unitPrice,
			customPrice: breakdown.customPrice,
			overridePrice: breakdown.customPrice,
		},
	});
}
