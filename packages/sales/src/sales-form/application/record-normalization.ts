import {
	type OrderInboundStatus,
	orderInboundStatuses,
} from "@gnd/utils/constants";
import {
	calculateSalesFormSummary,
	normalizeHptLineForLegacy,
	repriceSalesFormLineItemsByProfile,
	summarizeMouldingPersistRows,
	summarizeServiceRows,
	summarizeShelfRows,
} from "../domain";
import {
	divideMoney,
	multiplyMoney,
	roundMoney,
} from "../../payment-system/domain/money";

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

const DEFAULT_ORDER_PAYMENT_METHOD = "Credit Card";

export type SalesFormLineItemRecord = Record<string, any> & {
	id?: number | null;
	uid?: string | null;
	title?: string | null;
	description?: string | null;
	qty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
	taxxable?: boolean | null;
	meta?: Record<string, any> | null;
	formSteps?: any[] | null;
	shelfItems?: any[] | null;
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
export type SalesFormSaveValidationResult =
	| {
			valid: true;
			code: null;
			title: null;
			message: null;
	  }
	| {
			valid: false;
			code: "customer_required" | "line_item_required";
			title: string;
			message: string;
	  };

function roundCurrency(value: number) {
	return roundMoney(value);
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
	const meta = readObject(line.meta) as SalesFormLineItemRecord["meta"] & {
		mouldingRows?: Array<Record<string, unknown>>;
	};
	return Array.isArray(meta?.mouldingRows) ? meta.mouldingRows : [];
}

function getStoredServiceRows(line: SalesFormLineItemRecord) {
	const meta = readObject(line.meta) as SalesFormLineItemRecord["meta"] & {
		serviceRows?: Array<Record<string, unknown>>;
	};
	return Array.isArray(meta?.serviceRows) ? meta.serviceRows : [];
}

function readObject(value: unknown): Record<string, any> | null {
	if (!value) return null;
	if (typeof value === "string") {
		try {
			return readObject(JSON.parse(value));
		} catch {
			return null;
		}
	}
	return typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, any>)
		: null;
}

function deriveShelfLineTotalForSummary(shelfRows: any[]) {
	const rowsWithStoredTotals = shelfRows.filter(
		(row) => row?.totalPrice != null,
	);
	if (rowsWithStoredTotals.length) {
		return roundCurrency(
			rowsWithStoredTotals.reduce(
				(sum, row) => sum + Number(row?.totalPrice || 0),
				0,
			),
		);
	}
	return summarizeShelfRows(shelfRows).lineTotal;
}

function deriveShelfSummaryForNormalization(shelfRows: any[]) {
	const summary = summarizeShelfRows(shelfRows);
	return {
		qty: summary.qtyTotal,
		lineTotal: deriveShelfLineTotalForSummary(shelfRows),
	};
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

function getSaveLineTitle(line: Partial<SalesFormLineItemRecord>, index = 0) {
	return (
		normalizeSyntheticLineTitle(line.title) ||
		getItemTypeTitle(line) ||
		normalizeSyntheticLineTitle(line.description) ||
		`Item ${index + 1}`
	);
}

function deriveLineTotalForSummary(line: SalesFormLineItemRecord) {
	return deriveLineSummaryForNormalization(line).lineTotal;
}

function deriveLineSummaryForNormalization(line: SalesFormLineItemRecord) {
	const hptDoors = Array.isArray(line.housePackageTool?.doors)
		? line.housePackageTool.doors
		: [];

	if (hptDoors.length) {
		const normalizedHpt = normalizeHptLineForLegacy(
			line,
			readWorkflowDoorRouteConfig(line),
		).housePackageTool;
		return {
			qty: Number(normalizedHpt?.totalDoors || line.qty || 0),
			lineTotal: Number(normalizedHpt?.totalPrice || 0),
		};
	}

	const serviceRows = getStoredServiceRows(line);
	if (serviceRows.length) {
		const summary = summarizeServiceRows(line.uid || "", serviceRows);
		return {
			qty: summary.qtyTotal,
			lineTotal: summary.lineTotal,
		};
	}

	const mouldingRows = getStoredMouldingRows(line);
	if (mouldingRows.length) {
		const summary = summarizeMouldingPersistRows(mouldingRows, 0);
		return {
			qty: summary.qtyTotal,
			lineTotal: summary.total,
		};
	}

	const shelfRows = Array.isArray(line.shelfItems) ? line.shelfItems : [];
	if (shelfRows.length) {
		return deriveShelfSummaryForNormalization(shelfRows);
	}

	return {
		qty: Number(line.qty || 0),
		lineTotal: Number(line.lineTotal || 0),
	};
}

function readWorkflowDoorRouteConfig(line: SalesFormLineItemRecord) {
	const meta = readObject(line.meta);
	const config = meta?.workflowDoorRouteConfig;
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
	const computedTotal = multiplyMoney(qty, unitPrice);
	const baseLine = {
		id: line.id ?? null,
		uid: line.uid || createSalesFormLineItemUid(index),
		title: normalizeGroupedLineTitle(line),
		description: line.description ?? "",
		qty,
		unitPrice,
		lineTotal: roundCurrency(Number(line.lineTotal ?? computedTotal)),
		taxxable: line.taxxable ?? null,
		meta: line.meta ?? {},
		formSteps: line.formSteps ?? [],
		shelfItems: line.shelfItems ?? [],
		housePackageTool: line.housePackageTool ?? null,
	};
	const normalizedHptLine =
		Array.isArray(baseLine.housePackageTool?.doors) &&
		baseLine.housePackageTool.doors.length > 0
			? normalizeHptLineForLegacy(
					baseLine,
					readWorkflowDoorRouteConfig(baseLine),
				)
			: null;
	if (normalizedHptLine) {
		baseLine.housePackageTool = normalizedHptLine.housePackageTool;
	}
	const derivedSummary = deriveLineSummaryForNormalization(baseLine);
	const hasDerivedLineTotal =
		(Array.isArray(baseLine.housePackageTool?.doors) &&
			baseLine.housePackageTool.doors.length > 0) ||
		getStoredServiceRows(baseLine).length > 0 ||
		getStoredMouldingRows(baseLine).length > 0 ||
		(Array.isArray(baseLine.shelfItems) && baseLine.shelfItems.length > 0);
	const lineTotal = hasDerivedLineTotal
		? roundCurrency(derivedSummary.lineTotal)
		: baseLine.lineTotal;
	const nextQty = hasDerivedLineTotal ? Number(derivedSummary.qty || 0) : qty;
	const nextUnitPrice =
		hasDerivedLineTotal && nextQty > 0
			? divideMoney(lineTotal, nextQty)
			: unitPrice;

	return {
		...baseLine,
		qty: nextQty,
		unitPrice: nextUnitPrice,
		lineTotal,
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
		createdAt: meta.createdAt ?? null,
		paymentDueDate: meta.paymentDueDate ?? null,
		goodUntil: meta.goodUntil ?? null,
		prodDueDate: meta.prodDueDate ?? null,
		po: meta.po ?? "",
		notes: meta.notes ?? "",
		deliveryOption: meta.deliveryOption ?? "pickup",
		paymentMethod: meta.paymentMethod ?? null,
		taxCode: meta.taxCode ?? null,
		sellerOfRecord: meta.sellerOfRecord === "GND" ? "GND" : "DEALER",
		resaleCertificateOnFile: Boolean(meta.resaleCertificateOnFile),
	};
}

function normalizeSalesFormRecordMeta(
	record: Pick<SalesFormRecordLike, "type" | "form">,
) {
	const meta = normalizeSalesFormMeta(record.form || {});
	if (record.type === "order" && !meta.paymentMethod) {
		return {
			...meta,
			paymentMethod: DEFAULT_ORDER_PAYMENT_METHOD,
		};
	}
	return meta;
}

export function normalizeSalesFormInitialCustomerId(
	value: number | string | string[] | null | undefined,
) {
	const raw = Array.isArray(value) ? value[0] : value;
	if (raw == null || raw === "") return null;
	const customerId = Number(raw);
	return Number.isFinite(customerId) && customerId > 0 ? customerId : null;
}

export function applySalesFormInitialCustomerSelection<
	TRecord extends SalesFormRecordLike,
>(
	record: TRecord,
	input: {
		customerId?: number | string | string[] | null;
		customerProfileId?: number | string | string[] | null;
		preserveExisting?: boolean;
	},
): TRecord {
	const customerId = normalizeSalesFormInitialCustomerId(input.customerId);
	if (!customerId) return record;
	const customerProfileId = normalizeSalesFormInitialCustomerId(
		input.customerProfileId,
	);
	const currentForm = record.form || {};
	if (input.preserveExisting !== false && currentForm.customerId) return record;

	return {
		...record,
		form: normalizeSalesFormMeta({
			...currentForm,
			customerId,
			...(customerProfileId ? { customerProfileId } : {}),
		}),
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
		totalWithCcc: summary.totalWithCcc,
		discount: summary.discount,
		discountPct: summary.discountPct,
		percentDiscountValue: summary.percentDiscountValue,
		labor: summary.labor,
		delivery: summary.delivery,
		otherCosts: summary.otherCosts,
		taxableSubTotal: summary.taxableSubTotal,
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
	const form = normalizeSalesFormRecordMeta(record);
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
			...record.summary,
			...summary,
		},
	};
}

export function toSalesFormSaveDraftPayload<
	TRecord extends SalesFormRecordLike,
>(source: TRecord, autosave = true) {
	const lineItems = normalizeSalesFormLineItems(source.lineItems || []).map(
		(line, index) => ({
			...line,
			title: getSaveLineTitle(line, index),
		}),
	);
	const extraCosts = normalizeSalesFormExtraCosts(source.extraCosts || []);
	const meta = normalizeSalesFormRecordMeta(source);
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

export function validateSalesFormBeforeSave(
	record?: Pick<SalesFormRecordLike, "form" | "lineItems"> | null,
): SalesFormSaveValidationResult {
	if (!record?.form?.customerId) {
		return {
			valid: false,
			code: "customer_required",
			title: "Customer required",
			message: "Select a customer before saving.",
		};
	}
	if (!record?.lineItems?.length) {
		return {
			valid: false,
			code: "line_item_required",
			title: "Line item required",
			message: "Add at least one line item before saving.",
		};
	}
	return { valid: true, code: null, title: null, message: null };
}
