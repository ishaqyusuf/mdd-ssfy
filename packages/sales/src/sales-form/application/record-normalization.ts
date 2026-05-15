import {
	orderInboundStatuses,
	type OrderInboundStatus,
} from "@gnd/utils/constants";
import {
	calculateSalesFormSummary,
	repriceSalesFormLineItemsByProfile,
	summarizeDoors,
	summarizeMouldingPersistRows,
	summarizeServiceRows,
} from "../domain";

type SalesFormRecordLike = {
	type?: string | null;
	salesId?: number | null;
	slug?: string | null;
	inventoryStatus?: string | null;
	version?: string | null;
	form?: Record<string, any> | null;
	lineItems?: SalesFormLineItemRecord[];
	extraCosts?: SalesFormExtraCostRecord[];
	summary?: Record<string, any> | null;
	settings?: {
		cccPercentage?: number | null;
	} | null;
};

export type SalesFormLineItemRecord = Record<string, any> & {
	id?: number | null;
	uid?: string | null;
	title?: string | null;
	description?: string | null;
	qty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
	meta?: Record<string, any> | null;
	formSteps?: any[];
	shelfItems?: any[];
	housePackageTool?: any | null;
};

export type SalesFormExtraCostRecord = Record<string, any> & {
	id?: number | null;
	label?: string | null;
	type?: string | null;
	amount?: number | null;
	taxxable?: boolean | null;
};

export type SalesFormMetaRecord = Record<string, any>;
export type SalesFormSummaryRecord = Record<string, any>;

function roundCurrency(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeSyntheticLineTitle(value?: string | null) {
	const title = String(value ?? "").trim();
	if (!title) return "";
	return /^line\s+\d+$/i.test(title) ? "" : title;
}

function normalizeTitle(value?: string | null) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

function normalizeOrderInboundStatus(
	status?: string | null,
): OrderInboundStatus | null {
	return orderInboundStatuses.includes(status as OrderInboundStatus)
		? (status as OrderInboundStatus)
		: null;
}

function getStoredMouldingRows(line: SalesFormLineItemRecord) {
	const meta = line.meta as SalesFormLineItemRecord["meta"] & {
		mouldingRows?: Array<Record<string, unknown>>;
	};
	return Array.isArray(meta?.mouldingRows) ? meta.mouldingRows : [];
}

function getStoredServiceRows(line: SalesFormLineItemRecord) {
	const meta = line.meta as SalesFormLineItemRecord["meta"] & {
		serviceRows?: Array<Record<string, unknown>>;
	};
	return Array.isArray(meta?.serviceRows) ? meta.serviceRows : [];
}

function getItemTypeTitle(line: Partial<SalesFormLineItemRecord>) {
	const itemTypeStep = (line.formSteps || []).find(
		(step) => normalizeTitle(step?.step?.title) === "item type",
	);
	return String(itemTypeStep?.value || "").trim();
}

function isGroupedLineItem(line: Partial<SalesFormLineItemRecord>) {
	const itemType = normalizeTitle(getItemTypeTitle(line));
	if (
		itemType === "moulding" ||
		itemType === "mouldings" ||
		itemType === "molding" ||
		itemType === "moldings" ||
		itemType === "service" ||
		itemType === "services"
	) {
		return true;
	}

	return (
		getStoredMouldingRows(line as SalesFormLineItemRecord).length > 0 ||
		getStoredServiceRows(line as SalesFormLineItemRecord).length > 0
	);
}

function normalizeGroupedLineTitle(line: Partial<SalesFormLineItemRecord>) {
	const title = normalizeSyntheticLineTitle(line.title);
	if (!isGroupedLineItem(line)) return title;
	const itemTypeTitle = getItemTypeTitle(line);
	if (!itemTypeTitle) return title;
	return itemTypeTitle;
}

function deriveLineTotalForSummary(line: SalesFormLineItemRecord) {
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
		return summarizeServiceRows(line.uid || "", serviceRows).lineTotal;
	}

	const mouldingRows = getStoredMouldingRows(line);
	if (mouldingRows.length) {
		return summarizeMouldingPersistRows(mouldingRows, 0).total;
	}

	return Number(line.lineTotal || 0);
}

function deriveSummaryLineItems(lineItems: SalesFormLineItemRecord[]) {
	return (lineItems || []).map((line) => ({
		...line,
		lineTotal: deriveLineTotalForSummary(line),
	}));
}

export function createSalesFormLineItemUid(index = 0) {
	const stamp = Date.now().toString(36);
	const random = Math.random().toString(36).slice(2, 8);
	return `line-${index + 1}-${stamp}-${random}`;
}

export function createEmptySalesFormLineItem(
	index = 0,
): SalesFormLineItemRecord {
	return {
		id: null,
		uid: createSalesFormLineItemUid(index),
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

export function normalizeSalesFormLineItem(
	line: Partial<SalesFormLineItemRecord>,
	index = 0,
): SalesFormLineItemRecord {
	const qty = Number(line.qty ?? 0);
	const unitPrice = Number(line.unitPrice ?? 0);
	const computedTotal = roundCurrency(qty * unitPrice);

	return {
		id: line.id ?? null,
		uid: line.uid || createSalesFormLineItemUid(index),
		title: normalizeGroupedLineTitle(line),
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

export function normalizeSalesFormLineItems(
	lines: Partial<SalesFormLineItemRecord>[],
) {
	return (lines || []).map((line, index) =>
		normalizeSalesFormLineItem(line, index),
	);
}

export function normalizeSalesFormMeta(meta: Partial<SalesFormMetaRecord>) {
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

export function repriceSalesFormLineItemsForProfile(
	lineItems: SalesFormLineItemRecord[],
	previousProfileCoefficient?: number | null,
	nextProfileCoefficient?: number | null,
) {
	return repriceSalesFormLineItemsByProfile(
		lineItems || [],
		previousProfileCoefficient,
		nextProfileCoefficient,
	).map((line, index) => normalizeSalesFormLineItem(line, index));
}

export function computeSalesFormSummary(
	lineItems: SalesFormLineItemRecord[],
	taxRate = 0,
	extraCosts: SalesFormExtraCostRecord[] = [],
	paymentMethod?: string | null,
	cccPercentage?: number | null,
) {
	const summary = calculateSalesFormSummary({
		strategy: "legacy",
		taxRate,
		lineItems: deriveSummaryLineItems(lineItems),
		extraCosts: normalizeSalesFormExtraCosts(extraCosts),
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

export function normalizeSalesFormExtraCosts(
	costs: Partial<SalesFormExtraCostRecord>[] = [],
) {
	const normalized = (costs || []).map((cost, index) => ({
		id: cost.id ?? null,
		label: (cost.label || `Cost ${index + 1}`).trim(),
		type: String(cost.type || "CustomNonTaxxable"),
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

export function hydrateSalesFormRecord<TRecord extends SalesFormRecordLike>(
	record: TRecord,
) {
	const normalized = normalizeSalesFormLineItems(record.lineItems || []);
	const lineItems = normalized.length
		? normalized
		: [createEmptySalesFormLineItem(0)];
	const form = normalizeSalesFormMeta(record.form || {});
	const extraCosts = normalizeSalesFormExtraCosts(record.extraCosts || []);
	const summary = computeSalesFormSummary(
		lineItems,
		record.summary?.taxRate || 0,
		extraCosts,
		form.paymentMethod,
		record.settings?.cccPercentage,
	);

	return {
		...record,
		form,
		lineItems,
		extraCosts,
		summary: {
			...summary,
			...record.summary,
		},
	};
}

export function toSalesFormSaveDraftPayload<
	TRecord extends SalesFormRecordLike,
>(source: TRecord, autosave = true) {
	const lineItems = normalizeSalesFormLineItems(source.lineItems || []).map(
		(line) => ({
			...line,
			title: normalizeSyntheticLineTitle(line.title),
		}),
	);
	const extraCosts = normalizeSalesFormExtraCosts(source.extraCosts || []);
	const meta = normalizeSalesFormMeta(source.form || {});
	const summary = computeSalesFormSummary(
		lineItems,
		source.summary?.taxRate || 0,
		extraCosts,
		meta.paymentMethod,
		source.settings?.cccPercentage,
	);

	return {
		type: source.type,
		salesId: source.salesId,
		slug: source.slug,
		inventoryStatus:
			source.type === "order"
				? normalizeOrderInboundStatus(source.inventoryStatus)
				: null,
		version: source.version,
		autosave,
		meta,
		lineItems,
		extraCosts,
		summary,
	};
}
