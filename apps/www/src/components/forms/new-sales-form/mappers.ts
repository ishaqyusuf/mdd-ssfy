import type {
	NewSalesFormExtraCost,
	NewSalesFormLineItem,
	NewSalesFormMeta,
	NewSalesFormRecord,
	NewSalesFormSaveDraftInput,
	NewSalesFormSummary,
} from "./schema";
import {
	calculateSalesFormSummary,
	repriceSalesFormLineItemsByProfile,
	summarizeDoors,
	summarizeMouldingPersistRows,
	summarizeServiceRows,
} from "@gnd/sales/sales-form";

function roundCurrency(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeSyntheticLineTitle(value?: string | null) {
	const title = String(value ?? "").trim();
	if (!title) return "";
	return /^line\s+\d+$/i.test(title) ? "" : title;
}

function getStoredMouldingRows(line: NewSalesFormLineItem) {
	const meta = line.meta as NewSalesFormLineItem["meta"] & {
		mouldingRows?: Array<Record<string, unknown>>;
	};
	return Array.isArray(meta?.mouldingRows) ? meta.mouldingRows : [];
}

function getStoredServiceRows(line: NewSalesFormLineItem) {
	const meta = line.meta as NewSalesFormLineItem["meta"] & {
		serviceRows?: Array<Record<string, unknown>>;
	};
	return Array.isArray(meta?.serviceRows) ? meta.serviceRows : [];
}

function deriveLineTotalForSummary(line: NewSalesFormLineItem) {
	const hptDoors = Array.isArray(line.housePackageTool?.doors)
		? line.housePackageTool.doors
		: [];
	if (hptDoors.length) {
		const storedTotal = Number(line.housePackageTool?.totalPrice || 0);
		if (storedTotal > 0) return storedTotal;
		return summarizeDoors(hptDoors).totalPrice;
	}

	const serviceRows = getStoredServiceRows(line);
	if (serviceRows.length) {
		return summarizeServiceRows(line.uid, serviceRows).lineTotal;
	}

	const mouldingRows = getStoredMouldingRows(line);
	if (mouldingRows.length) {
		return summarizeMouldingPersistRows(mouldingRows, 0).total;
	}

	return Number(line.lineTotal || 0);
}

function deriveSummaryLineItems(lineItems: NewSalesFormLineItem[]) {
	return (lineItems || []).map((line) => ({
		...line,
		lineTotal: deriveLineTotalForSummary(line),
	}));
}

export function createLineItemUid(index = 0) {
	const stamp = Date.now().toString(36);
	const random = Math.random().toString(36).slice(2, 8);
	return `line-${index + 1}-${stamp}-${random}`;
}

export function createEmptyLineItem(index = 0): NewSalesFormLineItem {
	return {
		id: null,
		uid: createLineItemUid(index),
		title: "",
		description: "",
		qty: 1,
		unitPrice: 0,
		lineTotal: 0,
		meta: {},
		formSteps: [],
		shelfItems: [],
		housePackageTool: null,
	};
}

export function normalizeLineItem(
	line: Partial<NewSalesFormLineItem>,
	index = 0,
): NewSalesFormLineItem {
	const qty = Number(line.qty ?? 0);
	const unitPrice = Number(line.unitPrice ?? 0);
	const computedTotal = roundCurrency(qty * unitPrice);
	return {
		id: line.id ?? null,
		uid: line.uid || createLineItemUid(index),
		title: normalizeSyntheticLineTitle(line.title),
		description: line.description ?? "",
		qty,
		unitPrice,
		lineTotal: roundCurrency(Number(line.lineTotal ?? computedTotal)),
		meta: line.meta ?? {},
		formSteps: line.formSteps ?? [],
		shelfItems: line.shelfItems ?? [],
		housePackageTool: line.housePackageTool ?? null,
	};
}

export function normalizeLineItems(
	lines: Partial<NewSalesFormLineItem>[],
): NewSalesFormLineItem[] {
	return (lines || []).map((line, index) => normalizeLineItem(line, index));
}

export function normalizeMeta(
	meta: Partial<NewSalesFormMeta>,
): NewSalesFormMeta {
	const customerId =
		meta.customerId == null || meta.customerId === ""
			? null
			: Number(meta.customerId);
	const customerProfileId =
		meta.customerProfileId == null || meta.customerProfileId === ""
			? null
			: Number(meta.customerProfileId);
	const billingAddressId =
		meta.billingAddressId == null || meta.billingAddressId === ""
			? null
			: Number(meta.billingAddressId);
	const shippingAddressId =
		meta.shippingAddressId == null || meta.shippingAddressId === ""
			? null
			: Number(meta.shippingAddressId);
	return {
		customerId: Number.isFinite(customerId) ? customerId : null,
		customerProfileId: Number.isFinite(customerProfileId)
			? customerProfileId
			: null,
		billingAddressId: Number.isFinite(billingAddressId)
			? billingAddressId
			: null,
		shippingAddressId: Number.isFinite(shippingAddressId)
			? shippingAddressId
			: null,
		paymentTerm: meta.paymentTerm ?? "None",
		goodUntil: meta.goodUntil ?? null,
		prodDueDate: meta.prodDueDate ?? null,
		po: meta.po ?? "",
		notes: meta.notes ?? "",
		deliveryOption: meta.deliveryOption ?? "pickup",
		paymentMethod: meta.paymentMethod ?? null,
		taxCode: meta.taxCode ?? null,
	};
}

export function repriceLineItemsByProfile(
	lineItems: NewSalesFormLineItem[],
	previousProfileCoefficient?: number | null,
	nextProfileCoefficient?: number | null,
): NewSalesFormLineItem[] {
	return repriceSalesFormLineItemsByProfile(
		lineItems || [],
		previousProfileCoefficient,
		nextProfileCoefficient,
	).map((line, index) => normalizeLineItem(line, index));
}

export function computeSummary(
	lineItems: NewSalesFormLineItem[],
	taxRate = 0,
	extraCosts: NewSalesFormExtraCost[] = [],
	paymentMethod?: string | null,
	cccPercentage?: number | null,
): NewSalesFormSummary {
	const summaryLineItems = deriveSummaryLineItems(lineItems);
	const summary = calculateSalesFormSummary({
		strategy: "legacy",
		taxRate,
		lineItems: summaryLineItems,
		extraCosts,
		paymentMethod,
		cccPercentage,
	});
	return {
		subTotal: summary.subTotal,
		adjustedSubTotal: summary.adjustedSubTotal,
		taxRate: summary.taxRate,
		taxTotal: summary.taxTotal,
		grandTotal: summary.grandTotal,
		discount: summary.discount,
		discountPct: summary.discountPct,
		percentDiscountValue: summary.percentDiscountValue,
		labor: summary.labor,
		delivery: summary.delivery,
		otherCosts: summary.otherCosts,
		ccc: summary.ccc,
	};
}

export function normalizeExtraCosts(
	costs: Partial<NewSalesFormExtraCost>[] = [],
): NewSalesFormExtraCost[] {
	const normalized = (costs || []).map((cost, index) => ({
		id: cost.id ?? null,
		label: (cost.label || `Cost ${index + 1}`).trim(),
		type: (cost.type || "CustomNonTaxxable") as NewSalesFormExtraCost["type"],
		amount: Number(cost.amount || 0),
		taxxable: cost.taxxable ?? false,
	}));
	if (!normalized.some((cost) => cost.type === "Labor")) {
		normalized.push({
			id: null,
			label: "Labor",
			type: "Labor",
			amount: 0,
			taxxable: false,
		});
	}
	return normalized;
}

export function hydrateRecord(record: NewSalesFormRecord): NewSalesFormRecord {
	const normalized = normalizeLineItems(record.lineItems || []);
	const lineItems = normalized.length ? normalized : [createEmptyLineItem(0)];
	const meta = normalizeMeta(record.form || {});
	const extraCosts = normalizeExtraCosts(record.extraCosts || []);
	const summary = computeSummary(
		lineItems,
		record.summary?.taxRate || 0,
		extraCosts,
		meta.paymentMethod,
		(record as any).settings?.cccPercentage,
	);
	return {
		...record,
		form: meta,
		lineItems,
		extraCosts,
		summary: {
			...summary,
			...record.summary,
		},
	};
}

export function toSaveDraftInput(
	source: Pick<
		NewSalesFormRecord,
		| "type"
		| "salesId"
		| "slug"
		| "version"
		| "form"
		| "lineItems"
		| "extraCosts"
		| "summary"
	>,
	autosave = true,
): NewSalesFormSaveDraftInput {
	const lineItems = normalizeLineItems(source.lineItems || []).map((line) => ({
		...line,
		title: normalizeSyntheticLineTitle(line.title),
	}));
	const extraCosts = normalizeExtraCosts(source.extraCosts || []);
	const meta = normalizeMeta(source.form || {});
	const summary = computeSummary(
		lineItems,
		source.summary?.taxRate || 0,
		extraCosts,
		meta.paymentMethod,
		(source as any).settings?.cccPercentage,
	);
	return {
		type: source.type,
		salesId: source.salesId,
		slug: source.slug,
		version: source.version,
		autosave,
		meta,
		lineItems: lineItems as NewSalesFormSaveDraftInput["lineItems"],
		extraCosts,
		summary,
	};
}
