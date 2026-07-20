import { calculateSalesFormSummary } from "../sales-form/domain";
import {
	divideMoney,
	moneyRatio,
	multiplyMoney,
	percentageMoney,
	roundMoney,
	sumMoney,
} from "../payment-system/domain/money";

export type DealerPrintableSale = Record<string, any> & {
	dealerAuthId?: number | null;
	meta?: unknown;
	subTotal?: number | null;
	tax?: number | null;
	taxPercentage?: number | null;
	grandTotal?: number | null;
	amountDue?: number | null;
	dealerSale?: {
		dealerSalesPercentage?: number | null;
		grandTotal?: number | null;
		dueAmount?: number | null;
	} | null;
	extraCosts?: Array<Record<string, any>>;
	items?: Array<
		Record<string, any> & {
			meta?: unknown;
			rate?: number | null;
			total?: number | null;
		}
	>;
};

export type PrintPricingMode = "customer" | "internal";

function getObject(value: unknown): Record<string, any> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, any>)
		: null;
}

function roundCurrency(value: number) {
	return roundMoney(value);
}

function scalePrice(value: unknown, multiplier: number) {
	const amount = Number(value || 0);
	return Number.isFinite(amount) ? multiplyMoney(amount, multiplier) : 0;
}

function rowMultiplier(
	targetTotal: number,
	sourceTotal: number,
	fallback: number,
) {
	return sourceTotal > 0 ? moneyRatio(targetTotal, sourceTotal) : fallback;
}

function getDoorQty(door: Record<string, any>) {
	const explicitTotalQty = door.totalQty == null ? null : Number(door.totalQty);
	return explicitTotalQty != null && Number.isFinite(explicitTotalQty)
		? explicitTotalQty
		: Number(door.lhQty || 0) + Number(door.rhQty || 0);
}

function scaleMetadataRows(
	metaValue: unknown,
	targetTotal: number,
	fallbackMultiplier: number,
): Record<string, any> | null {
	const root = getObject(metaValue);
	if (!root) return null;
	const nested = getObject(root.meta);
	const source = nested || root;
	const sourceMouldingRows = Array.isArray(source.mouldingRows)
		? source.mouldingRows
		: [];
	const mouldingSourceTotal = sourceMouldingRows.reduce(
		(total: number, row: unknown) => {
			const record = getObject(row) || {};
			const qty = Number(record.qty || 0);
			const unitPrice =
				record.customPrice == null
					? Number(record.salesPrice || 0) + Number(record.addon || 0)
					: Number(record.customPrice || 0) + Number(record.addon || 0);
			return total + Number(record.lineTotal ?? qty * unitPrice);
		},
		0,
	);
	const mouldingMultiplier = rowMultiplier(
		targetTotal,
		mouldingSourceTotal,
		fallbackMultiplier,
	);
	const mouldingRows = sourceMouldingRows.length
		? source.mouldingRows.map((row: unknown) => {
				const record = getObject(row) || {};
				return {
					...record,
					...(record.salesPrice == null
						? {}
						: {
								salesPrice: scalePrice(record.salesPrice, mouldingMultiplier),
							}),
					...(record.customPrice == null
						? {}
						: {
								customPrice: scalePrice(record.customPrice, mouldingMultiplier),
							}),
					...(record.addon == null
						? {}
						: { addon: scalePrice(record.addon, mouldingMultiplier) }),
					...(record.lineTotal == null
						? {}
						: { lineTotal: scalePrice(record.lineTotal, mouldingMultiplier) }),
				};
			})
		: null;
	const sourceServiceRows = Array.isArray(source.serviceRows)
		? source.serviceRows
		: [];
	const serviceSourceTotal = sourceServiceRows.reduce(
		(total: number, row: unknown) => {
			const record = getObject(row) || {};
			return (
				total +
				Number(
					record.lineTotal ??
						Number(record.qty || 0) * Number(record.unitPrice || 0),
				)
			);
		},
		0,
	);
	const serviceMultiplier = rowMultiplier(
		targetTotal,
		serviceSourceTotal,
		fallbackMultiplier,
	);
	const serviceRows = sourceServiceRows.length
		? source.serviceRows.map((row: unknown) => {
				const record = getObject(row) || {};
				return {
					...record,
					...(record.unitPrice == null
						? {}
						: { unitPrice: scalePrice(record.unitPrice, serviceMultiplier) }),
					...(record.lineTotal == null
						? {}
						: { lineTotal: scalePrice(record.lineTotal, serviceMultiplier) }),
				};
			})
		: null;
	const scaled = {
		...source,
		...(mouldingRows ? { mouldingRows } : {}),
		...(serviceRows ? { serviceRows } : {}),
	};

	return nested ? { ...root, meta: scaled } : scaled;
}

function getDealerSalesPercentage(sale: DealerPrintableSale) {
	const value = Number(sale.dealerSale?.dealerSalesPercentage ?? 0);
	return Number.isFinite(value) ? value : 0;
}

function getPaymentMethod(sale: DealerPrintableSale) {
	const meta = getObject(sale.meta);
	return typeof meta?.payment_option === "string" ? meta.payment_option : null;
}

function getCccPercentage(sale: DealerPrintableSale) {
	const meta = getObject(sale.meta);
	const value = Number(meta?.ccc_percentage ?? 3.5);
	return Number.isFinite(value) ? value : 3.5;
}

export function resolveDealerPrintPricingSurface<
	TSale extends DealerPrintableSale,
>(sale: TSale, pricingMode?: PrintPricingMode | null): TSale {
	const isDealerOwned = Number(sale.dealerAuthId || 0) > 0;
	const resolvedMode = pricingMode || (isDealerOwned ? "customer" : "internal");
	if (!isDealerOwned) return sale;

	const dealerMultiplier =
		resolvedMode === "customer"
			? sumMoney([1, percentageMoney(1, getDealerSalesPercentage(sale))])
			: 1;
	const items = (sale.items || []).map((item) => {
		const qty = Number(item.qty || 0);
		const total = multiplyMoney(Number(item.total || 0), dealerMultiplier);
		const rate =
			qty > 0
				? divideMoney(total, qty)
				: multiplyMoney(Number(item.rate || 0), dealerMultiplier);
		const meta =
			scaleMetadataRows(item.meta, total, dealerMultiplier) || item.meta;
		const sourceShelfTotal = (item.shelfItems || []).reduce(
			(sum: number, shelfItem: Record<string, any>) =>
				sum +
				Number(
					shelfItem.totalPrice ??
						Number(shelfItem.qty || 0) * Number(shelfItem.unitPrice || 0),
				),
			0,
		);
		const shelfMultiplier = rowMultiplier(
			total,
			sourceShelfTotal,
			dealerMultiplier,
		);
		const shelfItems = (item.shelfItems || []).map(
			(shelfItem: Record<string, any>) => {
				const shelfQty = Number(shelfItem.qty || 0);
				const unitPrice = scalePrice(shelfItem.unitPrice, shelfMultiplier);
				return {
					...shelfItem,
					unitPrice,
					totalPrice: multiplyMoney(shelfQty, unitPrice),
				};
			},
		);
		const sourceDoorTotal = (item.housePackageTool?.doors || []).reduce(
			(sum: number, door: Record<string, any>) =>
				sum +
				Number(
					door.lineTotal ?? getDoorQty(door) * Number(door.unitPrice || 0),
				),
			0,
		);
		const doorMultiplier = rowMultiplier(
			total,
			sourceDoorTotal,
			dealerMultiplier,
		);
		const housePackageTool = item.housePackageTool
			? {
					...item.housePackageTool,
					totalPrice: total,
					doors: (item.housePackageTool.doors || []).map(
						(door: Record<string, any>) => {
							const doorQty = getDoorQty(door);
							const unitPrice = scalePrice(door.unitPrice, doorMultiplier);
							return {
								...door,
								unitPrice,
								lineTotal: roundCurrency(doorQty * unitPrice),
							};
						},
					),
				}
			: item.housePackageTool;

		return {
			...item,
			rate,
			total,
			meta,
			shelfItems,
			housePackageTool,
		};
	});
	if (resolvedMode === "internal") {
		return { ...sale, items } as TSale;
	}
	const summary = calculateSalesFormSummary({
		strategy: "legacy",
		taxRate: sale.taxPercentage,
		lineItems: items.map((item) => ({
			...item,
			unitPrice: item.rate,
			lineTotal: item.total,
			meta: getObject(item.meta) ?? {},
		})),
		extraCosts: (sale.extraCosts || []).map((cost) => ({
			...cost,
			type: String(cost.type || "CustomNonTaxxable"),
		})),
		paymentMethod: getPaymentMethod(sale),
		cccPercentage: getCccPercentage(sale),
	});

	return {
		...sale,
		subTotal: summary.subTotal,
		tax: summary.taxTotal,
		taxPercentage: summary.taxRate,
		grandTotal: summary.grandTotal,
		amountDue: Number(sale.dealerSale?.dueAmount ?? summary.grandTotal),
		items,
	} as TSale;
}
