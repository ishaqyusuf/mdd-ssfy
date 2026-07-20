import type {
	CalculateSalesFormSummaryInput,
	SalesFormExtraCostLike,
	SalesFormLineItemLike,
	SalesFormSummaryResult,
} from "../contracts/types";
import {
	multiplyMoney,
	percentageMoney,
	roundMoney,
	subtractMoney,
	sumMoney,
} from "../../payment-system/domain/money";
import { calculatePaymentChannelCharge } from "../../payment-system/domain/payment-channel-charge";
import { readSalesFormObjectMetadata } from "./metadata";

function safeNumber(value: unknown) {
	const num = Number(value ?? 0);
	return Number.isFinite(num) ? num : 0;
}

function firstPositiveNumber(...values: unknown[]) {
	for (const value of values) {
		const num = Number(value);
		if (Number.isFinite(num) && num > 0) return num;
	}
	return 0;
}

function normalizeTitle(value?: string | null) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

function isExtraCostTaxable(cost: SalesFormExtraCostLike) {
	if (typeof cost.taxxable === "boolean") return cost.taxxable;
	const type = normalizeTitle(String(cost.type || ""));
	if (type === "discount" || type === "discountpercentage") return false;
	if (type === "labor" || type === "flatlabor") return false;
	if (type === "customtaxxable") return true;
	if (type === "customnontaxxable") return false;
	if (type === "delivery") return true;
	return false;
}

function inferItemType(line: SalesFormLineItemLike) {
	const itemTypeStep = (line.formSteps || []).find(
		(step) => normalizeTitle(step?.step?.title) === "item type",
	);
	return normalizeTitle(itemTypeStep?.value);
}

function isTaxableLineLegacy(line: SalesFormLineItemLike) {
	if (typeof line.taxxable === "boolean") return line.taxxable;
	const itemType = inferItemType(line);
	const isService = itemType === "services" || itemType === "service";
	if (isService) {
		const metaTaxxable = readSalesFormObjectMetadata(line.meta)?.taxxable;
		if (typeof metaTaxxable === "boolean") return metaTaxxable;
		return false;
	}
	return true;
}

function isTaxableLineCurrent(line: SalesFormLineItemLike) {
	if (typeof line.taxxable === "boolean") return line.taxxable;
	return true;
}

function sumByType(extraCosts: SalesFormExtraCostLike[], types: string[]) {
	return sumMoney(
		extraCosts
			.filter((cost) => types.includes(String(cost.type)))
			.map((cost) => safeNumber(cost.amount)),
	);
}

function deriveLaborFromLineItems(lineItems: SalesFormLineItemLike[]) {
	const deriveRowsLabor = (rows: any[], fallbackRate: number) =>
		sumMoney(
			(rows || []).map((row: any) => {
				const rowMeta = readSalesFormObjectMetadata(row?.meta) || {};
				const unitLabor = safeNumber(
					row?.pricing?.unitLabor ??
						row?.unitLabor ??
						rowMeta.unitLabor ??
						rowMeta.laborConfig?.rate ??
						fallbackRate,
				);
				const laborQty = safeNumber(
					row?.pricing?.laborQty ??
						row?.laborQty ??
						rowMeta.laborQty ??
						row?.qty ??
						row?.totalQty,
				);
				if (!unitLabor || !laborQty) return 0;
				return multiplyMoney(unitLabor, laborQty);
			}),
		);

	return sumMoney(
		(lineItems || []).map((line) => {
			const lineAny = line as any;
			const lineMeta = readSalesFormObjectMetadata(lineAny?.meta) || {};
			const fallbackRate = safeNumber(lineMeta.laborConfig?.rate);
			const doors = Array.isArray(lineAny?.housePackageTool?.doors)
				? lineAny.housePackageTool.doors
				: [];
			const serviceRows = Array.isArray(lineMeta.serviceRows)
				? lineMeta.serviceRows
				: [];
			const mouldingRows = Array.isArray(lineMeta.mouldingRows)
				? lineMeta.mouldingRows
				: [];
			const shelfRows = Array.isArray(lineAny?.shelfItems)
				? lineAny.shelfItems
				: [];

			return sumMoney([
				deriveRowsLabor(doors, fallbackRate),
				deriveRowsLabor(serviceRows, fallbackRate),
				deriveRowsLabor(mouldingRows, fallbackRate),
				deriveRowsLabor(shelfRows, fallbackRate),
			]);
		}),
	);
}

function deriveShelfLineTotal(line: SalesFormLineItemLike) {
	const lineAny = line as any;
	if (lineAny?.housePackageTool) return null;
	const shelfRows = Array.isArray(lineAny?.shelfItems)
		? lineAny.shelfItems
		: [];
	if (!shelfRows.length) return null;
	return sumMoney(
		shelfRows.map((row: any) => {
			const rowMeta = readSalesFormObjectMetadata(row?.meta) || {};
			const explicitTotal = safeNumber(row?.totalPrice);
			if (explicitTotal > 0) return explicitTotal;
			const qty = safeNumber(row?.qty);
			const unitPrice = firstPositiveNumber(
				row?.customPrice,
				row?.salesPrice,
				row?.unitPrice,
				row?.basePrice,
				rowMeta.customPrice,
				rowMeta.salesPrice,
				rowMeta.unitPrice,
				rowMeta.basePrice,
			);
			return multiplyMoney(qty, unitPrice);
		}),
	);
}

function deriveLineTotalForSummary(line: SalesFormLineItemLike) {
	const shelfTotal = deriveShelfLineTotal(line);
	if (shelfTotal != null) return shelfTotal;
	const qty = safeNumber(line.qty);
	const unitPrice = safeNumber(line.unitPrice);
	const computed = multiplyMoney(qty, unitPrice);
	return line.lineTotal == null
		? computed
		: roundMoney(safeNumber(line.lineTotal));
}

export function calculateSalesFormSummary(
	input: CalculateSalesFormSummaryInput,
): SalesFormSummaryResult {
	const strategy = input.strategy || "current";
	const lineItems = input.lineItems || [];
	const extraCosts = input.extraCosts || [];

	const subTotal = sumMoney(lineItems.map(deriveLineTotalForSummary));

	const discount = sumByType(extraCosts, ["Discount"]);
	const discountPct = sumByType(extraCosts, ["DiscountPercentage"]);
	const labor = sumByType(extraCosts, ["Labor"]);
	const flatLabor = sumByType(extraCosts, ["FlatLabor"]);
	const derivedLabor = deriveLaborFromLineItems(lineItems);
	const effectiveLabor = derivedLabor > 0 ? derivedLabor : labor;
	const delivery = sumByType(extraCosts, ["Delivery"]);
	const deliveryTaxable = sumMoney(
		extraCosts
			.filter((cost) => String(cost.type) === "Delivery")
			.filter((cost) => isExtraCostTaxable(cost))
			.map((cost) => safeNumber(cost.amount)),
	);
	const deliveryNonTaxable = subtractMoney(delivery, deliveryTaxable);
	const otherCosts = sumMoney(
		extraCosts
			.filter(
				(cost) =>
					![
						"Labor",
						"FlatLabor",
						"Delivery",
						"Discount",
						"DiscountPercentage",
					].includes(String(cost.type)),
			)
			.map((cost) => safeNumber(cost.amount)),
	);
	const otherTaxableCosts = sumMoney(
		extraCosts
			.filter(
				(cost) =>
					![
						"Labor",
						"FlatLabor",
						"Delivery",
						"Discount",
						"DiscountPercentage",
					].includes(String(cost.type)),
			)
			.filter((cost) => isExtraCostTaxable(cost))
			.map((cost) => safeNumber(cost.amount)),
	);
	const otherNonTaxableCosts = subtractMoney(otherCosts, otherTaxableCosts);

	const normalizedTaxRate = Math.max(
		0,
		Math.min(100, safeNumber(input.taxRate)),
	);
	const percentDiscountValue = percentageMoney(subTotal, discountPct);
	const adjustedSubTotal = sumMoney([
		subTotal,
		-discount,
		-percentDiscountValue,
		effectiveLabor,
		delivery,
		otherCosts,
	]);

	if (strategy === "legacy") {
		const taxableLineSubTotal = sumMoney(
			lineItems.map((line) =>
				isTaxableLineLegacy(line) ? deriveLineTotalForSummary(line) : 0,
			),
		);

		const taxableBeforeDiscount = sumMoney([
			taxableLineSubTotal,
			delivery,
			otherCosts,
		]);
		const maxTaxableDiscount = Math.min(
			sumMoney([discount, percentDiscountValue]),
			taxableBeforeDiscount,
		);
		const taxableSubTotal = roundMoney(
			Math.max(0, subtractMoney(taxableBeforeDiscount, maxTaxableDiscount)),
		);
		const taxTotal = percentageMoney(taxableSubTotal, normalizedTaxRate);
		const subGrandTot = sumMoney([
			subTotal,
			-discount,
			-percentDiscountValue,
			taxTotal,
		]);
		const extraCostsBeforeCcc = sumMoney([
			deliveryTaxable,
			deliveryNonTaxable,
			otherTaxableCosts,
			otherNonTaxableCosts,
		]);
		const grandTotal = sumMoney([
			subGrandTot,
			extraCostsBeforeCcc,
			effectiveLabor,
			flatLabor,
		]);
		const channelCharge = calculatePaymentChannelCharge({
			paymentMethod: input.paymentMethod,
			paymentAmount: grandTotal,
			cccPercentage: input.cccPercentage,
		});

		return {
			subTotal,
			adjustedSubTotal,
			taxRate: normalizedTaxRate,
			taxTotal,
			grandTotal,
			totalWithCcc: channelCharge.chargeAmount,
			discount,
			discountPct,
			percentDiscountValue,
			labor: sumMoney([effectiveLabor, flatLabor]),
			delivery,
			otherCosts,
			taxableSubTotal,
			ccc: channelCharge.amount,
			strategy,
		};
	}

	const taxableLineSubTotalCurrent = sumMoney(
		lineItems.map((line) =>
			isTaxableLineCurrent(line) ? deriveLineTotalForSummary(line) : 0,
		),
	);
	const taxableBeforeDiscount = sumMoney([
		taxableLineSubTotalCurrent,
		deliveryTaxable,
		otherTaxableCosts,
	]);
	const maxTaxableDiscount = Math.min(
		sumMoney([discount, percentDiscountValue]),
		taxableBeforeDiscount,
	);
	const taxableSubTotal = roundMoney(
		Math.max(0, subtractMoney(taxableBeforeDiscount, maxTaxableDiscount)),
	);
	const taxTotal = percentageMoney(taxableSubTotal, normalizedTaxRate);
	const grandTotal = sumMoney([adjustedSubTotal, taxTotal]);
	const channelCharge = calculatePaymentChannelCharge({
		paymentMethod: input.paymentMethod,
		paymentAmount: grandTotal,
		cccPercentage: input.cccPercentage,
	});
	return {
		subTotal,
		adjustedSubTotal,
		taxRate: normalizedTaxRate,
		taxTotal,
		grandTotal,
		totalWithCcc: channelCharge.chargeAmount,
		discount,
		discountPct,
		percentDiscountValue,
		labor: sumMoney([effectiveLabor, flatLabor]),
		delivery,
		otherCosts,
		taxableSubTotal,
		ccc: channelCharge.amount,
		strategy,
	};
}
