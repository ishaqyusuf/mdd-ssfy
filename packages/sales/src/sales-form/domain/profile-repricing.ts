import {
	computeHptSharedDoorSurcharge,
	normalizeHptDoorRowForLegacy,
} from "./hpt-compatibility";
import { sharedMouldingComponentPrice } from "./workflow-calculators";
import {
	divideMoney,
	multiplyMoney,
	roundMoney,
	sumMoney,
} from "../../payment-system/domain/money";
import { readSalesFormObjectMetadata } from "./metadata";

function roundCurrency(value: number) {
	return roundMoney(value);
}

function toFinite(value: unknown): number | null {
	if (value == null) return null;
	const num = Number(value);
	return Number.isFinite(num) ? num : null;
}

function toProfileMultiplier(coefficient?: number | null) {
	const coeff = Number(coefficient);
	if (!Number.isFinite(coeff) || coeff === 0) return 1;
	return divideMoney(1, coeff);
}

function valueFromPath(source: unknown, path: string[]): unknown {
	let cursor = source as Record<string, unknown> | null | undefined;
	for (const key of path) {
		if (!cursor || typeof cursor !== "object") return null;
		const nextValue = cursor[key];
		cursor =
			key === "meta"
				? readSalesFormObjectMetadata(nextValue)
				: (nextValue as Record<string, unknown> | null | undefined);
	}
	return cursor;
}

function firstFinite(source: unknown, paths: string[][]) {
	for (const path of paths) {
		const value = toFinite(valueFromPath(source, path));
		if (value != null) return value;
	}
	return null;
}

function repriceMouldingRows(
	rows: Array<Record<string, unknown>>,
	nextMultiplier: number,
	ratio: number,
	sharedComponentPrice: number,
) {
	return rows.map((row) => {
		const rowMeta = readSalesFormObjectMetadata(row?.meta) || {};
		const qty = toFinite(row?.qty) ?? 0;
		const addon = toFinite(row?.addon) ?? toFinite(rowMeta.addon) ?? 0;
		const customPrice = firstFinite(row, [
			["customPrice"],
			["meta", "customPrice"],
		]);
		const basePrice = firstFinite(row, [
			["basePrice"],
			["baseUnitPrice"],
			["meta", "basePrice"],
			["meta", "baseUnitPrice"],
		]);
		const currentSalesPrice = firstFinite(row, [
			["salesPrice"],
			["unitPrice"],
			["meta", "salesPrice"],
			["meta", "unitPrice"],
		]);
		const salesPrice =
			basePrice != null
				? multiplyMoney(basePrice, nextMultiplier)
				: multiplyMoney(currentSalesPrice ?? 0, ratio);
		const estimateUnit = sumMoney([sharedComponentPrice, salesPrice]);
		const effectiveUnit = customPrice != null ? customPrice : estimateUnit;
		const unit = sumMoney([effectiveUnit, addon]);
		const nextRowMeta = {
			...rowMeta,
			...(basePrice == null ? {} : { basePrice }),
			salesPrice,
			addon,
			customPrice: customPrice ?? null,
			unitPrice: unit,
		};
		return {
			...row,
			qty,
			addon,
			customPrice: customPrice ?? null,
			salesPrice,
			basePrice: basePrice ?? 0,
			estimateUnit,
			unit,
			lineTotal: multiplyMoney(qty, unit),
			meta: nextRowMeta,
		};
	});
}

export type SalesFormProfileStepLike = {
	price?: number | null;
	basePrice?: number | null;
	meta?: Record<string, unknown> | string | null;
	[key: string]: unknown;
};

export type SalesFormProfileShelfItemLike = {
	qty?: number | null;
	unitPrice?: number | null;
	totalPrice?: number | null;
	meta?: Record<string, unknown> | string | null;
	[key: string]: unknown;
};

export type SalesFormProfileDoorLike = {
	totalQty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
	meta?: Record<string, unknown> | string | null;
	[key: string]: unknown;
};

export type SalesFormHousePackageToolLike = {
	doors?: SalesFormProfileDoorLike[] | null;
	totalDoors?: number | null;
	totalPrice?: number | null;
	[key: string]: unknown;
};

export type SalesFormProfileLineItemLike = {
	qty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
	meta?: Record<string, unknown> | string | null;
	formSteps?: SalesFormProfileStepLike[] | null;
	shelfItems?: SalesFormProfileShelfItemLike[] | null;
	housePackageTool?: SalesFormHousePackageToolLike | null;
	[key: string]: unknown;
};

export function repriceSalesFormLineItemsByProfile<
	TLine extends SalesFormProfileLineItemLike,
>(
	lineItems: TLine[],
	previousProfileCoefficient?: number | null,
	nextProfileCoefficient?: number | null,
): TLine[] {
	const prevMultiplier = toProfileMultiplier(previousProfileCoefficient);
	const nextMultiplier = toProfileMultiplier(nextProfileCoefficient);
	const ratio =
		prevMultiplier === 0 ? 1 : divideMoney(nextMultiplier, prevMultiplier);

	return (lineItems || []).map((line) => {
		const formSteps = (line.formSteps || []).map((step) => {
			const stepMeta = readSalesFormObjectMetadata(step?.meta) || {};
			const selectedComponents = Array.isArray(stepMeta.selectedComponents)
				? stepMeta.selectedComponents.map((component: any) => {
						const componentBase = toFinite(component?.basePrice);
						const currentSales = toFinite(component?.salesPrice);
						return {
							...component,
							salesPrice:
								componentBase != null
									? multiplyMoney(componentBase, nextMultiplier)
									: currentSales != null
										? multiplyMoney(currentSales, ratio)
										: currentSales,
						};
					})
				: stepMeta.selectedComponents;

			const selectedComponentsPrice = Array.isArray(selectedComponents)
				? sumMoney(
						selectedComponents.map((component: any) => {
							const sales = toFinite(component?.salesPrice);
							return Number(sales || 0);
						}),
					)
				: null;
			const hasSelectedComponentsPrice =
				selectedComponentsPrice != null &&
				Array.isArray(selectedComponents) &&
				selectedComponents.some((component: any) =>
					Number.isFinite(Number(component?.salesPrice)),
				);

			const basePrice = toFinite(step?.basePrice);
			const currentPrice = toFinite(step?.price);
			const nextPrice = hasSelectedComponentsPrice
				? roundCurrency(Number(selectedComponentsPrice || 0))
				: basePrice != null
					? multiplyMoney(basePrice, nextMultiplier)
					: currentPrice != null
						? multiplyMoney(currentPrice, ratio)
						: currentPrice;

			return {
				...step,
				price: nextPrice,
				meta:
					selectedComponents == null
						? step?.meta
						: {
								...stepMeta,
								selectedComponents,
							},
			};
		});

		const shelfItems = (line.shelfItems || []).map((row) => {
			const rowMeta = readSalesFormObjectMetadata(row?.meta) || {};
			const unitPrice = toFinite(row?.unitPrice) ?? 0;
			const qty = toFinite(row?.qty) ?? 0;
			const customPrice = firstFinite(row, [
				["customPrice"],
				["meta", "customPrice"],
			]);
			const baseUnitPrice = firstFinite(row, [
				["basePrice"],
				["baseUnitPrice"],
				["meta", "basePrice"],
				["meta", "baseUnitPrice"],
				["meta", "priceData", "baseUnitCost"],
				["meta", "priceData", "basePrice"],
			]);
			const nextSalesPrice =
				baseUnitPrice != null
					? multiplyMoney(baseUnitPrice, nextMultiplier)
					: multiplyMoney(unitPrice, ratio);
			const nextUnitPrice =
				customPrice != null ? roundCurrency(customPrice) : nextSalesPrice;
			return {
				...row,
				salesPrice: nextSalesPrice,
				unitPrice: nextUnitPrice,
				totalPrice: multiplyMoney(qty, nextUnitPrice),
				meta: {
					...rowMeta,
					...(baseUnitPrice == null ? {} : { basePrice: baseUnitPrice }),
					salesPrice: nextSalesPrice,
					unitPrice: nextUnitPrice,
					customPrice: customPrice ?? null,
				},
			};
		});
		const lineMeta = readSalesFormObjectMetadata(line.meta) || {};
		const existingMouldingRows = Array.isArray(lineMeta.mouldingRows)
			? (lineMeta.mouldingRows as Array<Record<string, unknown>>)
			: [];
		const mouldingRows = existingMouldingRows.length
			? repriceMouldingRows(
					existingMouldingRows,
					nextMultiplier,
					ratio,
					sharedMouldingComponentPrice(formSteps),
				)
			: [];

		const existingDoors = line.housePackageTool?.doors || [];
		const repricedLineForSurcharge = {
			...line,
			formSteps,
		};
		const sharedDoorSurcharge = computeHptSharedDoorSurcharge(
			repricedLineForSurcharge,
		);
		const doorRouteConfig = readWorkflowDoorRouteConfig(line);
		const doors = existingDoors.map((door) => {
			const doorMeta = readSalesFormObjectMetadata(door?.meta) || {};
			const currentUnit = toFinite(door?.unitPrice) ?? 0;
			const baseUnitPrice = firstFinite(door, [
				["basePrice"],
				["baseUnitPrice"],
				["meta", "basePrice"],
				["meta", "baseUnitPrice"],
				["meta", "priceData", "baseUnitCost"],
				["meta", "priceData", "basePrice"],
			]);
			const fallbackDoorSales =
				baseUnitPrice != null
					? multiplyMoney(baseUnitPrice, nextMultiplier)
					: multiplyMoney(currentUnit, ratio);
			return normalizeHptDoorRowForLegacy(
				{
					...door,
					jambSizePrice: fallbackDoorSales,
					meta: {
						...doorMeta,
						...(baseUnitPrice == null ? {} : { baseUnitPrice }),
						doorSalesUnitPrice: fallbackDoorSales,
					},
				},
				{
					sharedDoorSurcharge,
					salesMultiplier: nextMultiplier,
					...doorRouteConfig,
				},
			);
		});

		const doorQty = doors.reduce(
			(sum, row) => sum + Number(row?.totalQty || 0),
			0,
		);
		const doorTotal = sumMoney(doors.map((row) => Number(row?.lineTotal || 0)));
		const stepUnit = sumMoney(
			formSteps.map((step) => {
				const value = toFinite(step?.price);
				return Number(value || 0);
			}),
		);
		const shelfTotal = sumMoney(
			shelfItems.map((row) => Number(row?.totalPrice || 0)),
		);
		const mouldingQty = mouldingRows.reduce(
			(sum, row) => sum + Number(row?.qty || 0),
			0,
		);
		const mouldingTotal = sumMoney(
			mouldingRows.map((row) => Number(row?.lineTotal || 0)),
		);

		let qty = Number(line.qty || 0);
		let unitPrice = Number(line.unitPrice || 0);
		let lineTotal = Number(line.lineTotal || qty * unitPrice);

		if (doors.length) {
			qty = doorQty || qty;
			lineTotal = roundCurrency(doorTotal);
			unitPrice = qty > 0 ? divideMoney(lineTotal, qty) : unitPrice;
		} else if (mouldingRows.length) {
			qty = mouldingQty || qty;
			lineTotal = roundCurrency(mouldingTotal);
			unitPrice = qty > 0 ? divideMoney(lineTotal, qty) : unitPrice;
		} else if (shelfItems.length) {
			lineTotal = roundCurrency(shelfTotal);
			unitPrice = qty > 0 ? divideMoney(lineTotal, qty) : unitPrice;
		} else if (formSteps.length) {
			unitPrice = roundCurrency(stepUnit);
			lineTotal = multiplyMoney(qty, unitPrice);
		} else {
			unitPrice = multiplyMoney(unitPrice, ratio);
			lineTotal = multiplyMoney(qty, unitPrice);
		}

		return {
			...line,
			qty,
			unitPrice,
			lineTotal,
			formSteps,
			shelfItems,
			meta: mouldingRows.length
				? {
						...lineMeta,
						mouldingRows,
					}
				: line.meta,
			housePackageTool: line.housePackageTool
				? {
						...line.housePackageTool,
						doors,
						totalDoors: doors.length
							? doorQty
							: line.housePackageTool.totalDoors,
						totalPrice: doors.length
							? roundCurrency(doorTotal)
							: line.housePackageTool.totalPrice,
					}
				: line.housePackageTool,
		} as TLine;
	});
}

function readWorkflowDoorRouteConfig(line: SalesFormProfileLineItemLike) {
	const meta = readSalesFormObjectMetadata(line.meta) || {};
	const config = meta.workflowDoorRouteConfig;
	if (!config || typeof config !== "object" || Array.isArray(config)) {
		return {};
	}
	const routeConfig = config as {
		noHandle?: unknown;
		hasSwing?: unknown;
	};
	return {
		...(typeof routeConfig.noHandle === "boolean"
			? { noHandle: routeConfig.noHandle }
			: {}),
		...(typeof routeConfig.hasSwing === "boolean"
			? { hasSwing: routeConfig.hasSwing }
			: {}),
	};
}
