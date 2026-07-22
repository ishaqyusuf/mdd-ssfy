import {
	type SalesFormExtraCostRecord,
	type SalesFormLineItemRecord,
	type SalesFormMetaRecord,
	type SalesFormSummaryRecord,
	applySalesFormInitialCustomerSelection,
	computeNormalizedSalesFormSummary,
	createEmptySalesFormLineItem,
	hydrateSalesFormRecord,
	normalizeSalesFormExtraCosts,
	normalizeSalesFormLineItems,
	toSalesFormSaveDraftPayload,
} from "../application";
import {
	type DualPricingSnapshot,
	type SalesFormPricingProfile,
	buildDualSalesFormPricingSnapshot,
	calculateSalesFormSummary,
} from "../domain";
import { multiplyMoney, roundMoney } from "../../payment-system/domain/money";

export type SalesFormComposerSurface = "www" | "dealership" | "storefront";

export type CoefficientPricingAdapter = {
	mode: "coefficient";
	profile?: SalesFormPricingProfile | null;
};

export type PercentagePricingAdapter = {
	mode: "percentage";
	internalProfile?: SalesFormPricingProfile | null;
	dealerProfile?: SalesFormPricingProfile | null;
};

export type SalesFormPricingAdapter =
	| CoefficientPricingAdapter
	| PercentagePricingAdapter;

export type SalesFormComposerConfig = {
	surface: SalesFormComposerSurface;
	pricing?: SalesFormPricingAdapter | null;
};

export type SalesFormComposerRecord = Record<string, unknown> & {
	type?: "order" | "quote" | string | null;
	salesId?: number | null;
	slug?: string | null;
	inventoryStatus?: string | null;
	version?: string | null;
	form?: Record<string, unknown> | null;
	lineItems?: SalesFormLineItemRecord[];
	extraCosts?: SalesFormExtraCostRecord[];
	summary?: SalesFormSummaryRecord | null;
	settings?: {
		cccPercentage?: number | null;
	} | null;
};

export type CoefficientPricingSnapshot = {
	source: "sales_form_coefficient_pricing";
	mode: "coefficient";
	profile: {
		id: number | null;
		label: string | null;
		coefficient: number;
	};
	summary: ReturnType<typeof computeNormalizedSalesFormSummary>;
};

export type SalesFormComposerPricingSnapshot =
	| CoefficientPricingSnapshot
	| DualPricingSnapshot;

export type SalesFormComposerPricingProfile = SalesFormPricingProfile & {
	title?: string | null;
};

export type ComposeDealerSalesFormQuotePricingSnapshotInput = {
	lineItems: SalesFormLineItemRecord[];
	extraCosts?: SalesFormExtraCostRecord[];
	taxRate?: number | null;
	paymentMethod?: string | null;
	cccPercentage?: number | null;
	internalProfile?: SalesFormComposerPricingProfile | null;
	dealerProfile?: SalesFormComposerPricingProfile | null;
	createdAt?: string | Date | null;
	sellerOfRecord?: "DEALER" | "GND" | null;
	resaleCertificateOnFile?: boolean | null;
};

export type DealerSalesFormQuoteSource = {
	id?: number | null;
	orderId?: string | null;
	slug?: string | null;
	status?: string | null;
	type?: string | null;
	customerId?: number | null;
	customerProfileId?: number | null;
	po?: string | null;
	paymentTerm?: string | null;
	goodUntil?: string | null;
	deliveryOption?: string | null;
	paymentMethod?: string | null;
	taxCode?: string | null;
	taxRate?: number | null;
	sellerOfRecord?: "DEALER" | "GND" | null;
	resaleCertificateOnFile?: boolean | null;
	lineItems?: unknown;
	pricingContext?: DealerSalesFormQuotePricingContext | null;
};

export type DealerSalesFormQuotePricingContext = {
	internal?: {
		customerProfileId?: number | null;
		savedCoefficient?: number | null;
		currentCoefficient?: number | null;
		hasChanged?: boolean | null;
	} | null;
	dealer?: {
		dealerCustomerProfileId?: number | null;
		savedSalesPercentage?: number | null;
		currentSalesPercentage?: number | null;
		hasChanged?: boolean | null;
	} | null;
};

export type DealerSalesFormQuoteLineItemRecord = SalesFormLineItemRecord & {
	uid: string;
	title: string;
	qty: number;
	unitPrice: number;
	lineTotal: number;
	formSteps?: Record<string, unknown>[];
	shelfItems?: Record<string, unknown>[];
	housePackageTool?: Record<string, unknown> | null;
};

export type DealerSalesFormQuoteRecord = {
	id?: number | null;
	type: "quote";
	salesId?: number | null;
	orderId?: string | null;
	slug?: string | null;
	status?: string | null;
	version?: string | null;
	updatedAt?: string | null;
	form: SalesFormMetaRecord & {
		customerId: number | null;
		customerProfileId: number | null;
		po?: string | null;
		paymentTerm?: string | null;
		goodUntil?: string | null;
		deliveryOption?: string | null;
		paymentMethod?: string | null;
		taxCode?: string | null;
		sellerOfRecord?: "DEALER" | "GND" | null;
		resaleCertificateOnFile?: boolean | null;
	};
	lineItems: DealerSalesFormQuoteLineItemRecord[];
	extraCosts: SalesFormExtraCostRecord[];
	summary: SalesFormSummaryRecord;
};

export type DealerSalesFormQuoteSaveInput = {
	id?: number | null;
	customerId: number;
	customerProfileId?: number | null;
	pricingContext?: {
		salesCoefficient?: number | null;
		dealerSalesPercentage?: number | null;
	} | null;
	po?: string | null;
	paymentTerm?: string | null;
	goodUntil?: string | null;
	deliveryOption?: string | null;
	paymentMethod?: string | null;
	taxCode?: string | null;
	taxRate?: number | null;
	sellerOfRecord?: "DEALER" | "GND" | null;
	resaleCertificateOnFile?: boolean | null;
	lineItems: Array<{
		uid: string;
		title?: string | null;
		description?: string | null;
		qty?: number | null;
		unitPrice?: number | null;
		lineTotal?: number | null;
		taxxable?: boolean | null;
		meta?: Record<string, unknown> | null;
		formSteps?: Record<string, unknown>[] | null;
		shelfItems?: Record<string, unknown>[] | null;
		housePackageTool?: Record<string, unknown> | null;
	}>;
};

function normalizeCoefficient(profile?: SalesFormPricingProfile | null) {
	const value = Number(profile?.coefficient ?? 1);
	return Number.isFinite(value) && value > 0 ? value : 1;
}

function withPricingLabel(
	profile?: SalesFormComposerPricingProfile | null,
): SalesFormPricingProfile | null {
	if (!profile) return null;
	return {
		...profile,
		label: profile.label ?? profile.title ?? null,
	};
}

export function composeSalesFormRecord<TRecord extends SalesFormComposerRecord>(
	record: TRecord,
	_config?: SalesFormComposerConfig,
): TRecord {
	return hydrateSalesFormRecord(record) as TRecord;
}

export function composeSalesFormSavePayload<
	TRecord extends SalesFormComposerRecord,
>(
	record: TRecord,
	config: SalesFormComposerConfig & {
		autosave?: boolean;
	},
) {
	return toSalesFormSaveDraftPayload(record, config.autosave ?? true);
}

export function composeSalesFormPricingSnapshot(input: {
	config: SalesFormComposerConfig;
	lineItems: SalesFormLineItemRecord[];
	extraCosts?: SalesFormExtraCostRecord[];
	taxRate?: number | null;
	paymentMethod?: string | null;
	cccPercentage?: number | null;
	createdAt?: string | Date | null;
}): SalesFormComposerPricingSnapshot {
	const pricing = input.config.pricing;
	if (pricing?.mode === "percentage") {
		const lineItems = normalizeSalesFormLineItems(input.lineItems || []).map(
			(line) => ({
				...line,
				uid: String(line.uid || ""),
			}),
		);
		const extraCosts = normalizeSalesFormExtraCosts(input.extraCosts || []).map(
			(cost) => ({
				...cost,
				type: String(cost.type || "CustomNonTaxxable"),
			}),
		);
		return buildDualSalesFormPricingSnapshot({
			lineItems,
			extraCosts,
			taxRate: input.taxRate,
			paymentMethod: input.paymentMethod,
			cccPercentage: input.cccPercentage,
			internalProfile: pricing.internalProfile,
			dealerProfile: pricing.dealerProfile,
			createdAt: input.createdAt,
		});
	}

	const profile = pricing?.mode === "coefficient" ? pricing.profile : null;
	const coefficient = normalizeCoefficient(profile);
	const pricedLines = normalizeSalesFormLineItems(input.lineItems || []).map(
		(line) => {
			const qty = Number(line.qty ?? 0);
			const unitPrice = multiplyMoney(Number(line.unitPrice || 0), coefficient);
			return {
				...line,
				qty,
				unitPrice,
				lineTotal: multiplyMoney(qty, unitPrice),
			};
		},
	);

	return {
		source: "sales_form_coefficient_pricing",
		mode: "coefficient",
		profile: {
			id: profile?.id ?? null,
			label: profile?.label ?? null,
			coefficient,
		},
		summary: computeNormalizedSalesFormSummary(
			pricedLines,
			input.taxRate || 0,
			input.extraCosts || [],
			input.paymentMethod,
			input.cccPercentage,
		),
	};
}

function roundCurrency(value: number) {
	return roundMoney(value);
}

function safeObject(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function safeObjectArray(value: unknown): Record<string, unknown>[] {
	return Array.isArray(value)
		? value
				.filter(
					(item): item is Record<string, unknown> =>
						Boolean(item) && typeof item === "object" && !Array.isArray(item),
				)
				.map((item) => safeObject(item))
		: [];
}

function hasStructuredLinePricing(
	line: SalesFormLineItemRecord & Record<string, unknown>,
) {
	const meta = safeObject(line.meta);
	return (
		(Array.isArray(line.shelfItems) && line.shelfItems.length > 0) ||
		Boolean(safeObject(line.housePackageTool).totalPrice) ||
		(Array.isArray(meta.serviceRows) && meta.serviceRows.length > 0) ||
		(Array.isArray(meta.mouldingRows) && meta.mouldingRows.length > 0)
	);
}

export function resolveDealerSalesFormStructuredLineTotal(
	line: SalesFormLineItemRecord & Record<string, unknown>,
) {
	if (!hasStructuredLinePricing(line)) return null;
	return roundCurrency(
		calculateSalesFormSummary({
			strategy: "legacy",
			taxRate: 0,
			lineItems: [line],
			extraCosts: [],
		}).subTotal,
	);
}

export function createDealerSalesFormLineItem(
	index = 0,
): DealerSalesFormQuoteLineItemRecord {
	const line = createEmptySalesFormLineItem(index);
	return {
		...line,
		uid: `dealer-line-${index + 1}-${Date.now().toString(36)}-${Math.random()
			.toString(36)
			.slice(2, 8)}`,
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

export function normalizeDealerSalesFormLineItems(
	value: unknown,
): DealerSalesFormQuoteLineItemRecord[] {
	if (!Array.isArray(value) || !value.length) {
		return [createDealerSalesFormLineItem(0)];
	}

	return value.map((line, index) => {
		const record = safeObject(line);
		const qty = Number(record.qty || 0);
		const unitPrice = Number(record.unitPrice || 0);
		const lineTotal = Number(record.lineTotal ?? qty * unitPrice);

		return {
			...createEmptySalesFormLineItem(index),
			uid: String(record.uid || `dealer-line-${index + 1}`),
			title: typeof record.title === "string" ? record.title : "",
			description:
				typeof record.description === "string" ? record.description : "",
			qty,
			unitPrice,
			lineTotal,
			meta: safeObject(record.meta),
			formSteps: safeObjectArray(record.formSteps),
			shelfItems: safeObjectArray(record.shelfItems),
			housePackageTool: record.housePackageTool
				? safeObject(record.housePackageTool)
				: null,
		};
	});
}

export function composeDealerSalesFormQuoteRecord(
	source?: DealerSalesFormQuoteSource | null,
	initialCustomerId?: number | string | string[] | null,
): DealerSalesFormQuoteRecord {
	const taxRate = Number(source?.taxRate || 0);
	const record: DealerSalesFormQuoteRecord = {
		id: source?.id || null,
		type: "quote",
		salesId: source?.id || null,
		orderId: source?.orderId || null,
		slug: source?.slug || null,
		status: source?.status || "Draft",
		version: String(source?.id || "new"),
		updatedAt: null,
		form: {
			customerId: source?.customerId || null,
			customerProfileId: source?.customerProfileId || null,
			po: source?.po || null,
			paymentTerm: source?.paymentTerm || "None",
			goodUntil: source?.goodUntil || null,
			deliveryOption: source?.deliveryOption || "pickup",
			paymentMethod: source?.paymentMethod || null,
			taxCode: source?.taxCode || null,
			sellerOfRecord: source?.sellerOfRecord || "DEALER",
			resaleCertificateOnFile: Boolean(source?.resaleCertificateOnFile),
		},
		lineItems: normalizeDealerSalesFormLineItems(source?.lineItems),
		extraCosts: [],
		summary: {
			taxRate,
			subTotal: 0,
			grandTotal: 0,
		},
	};

	return applySalesFormInitialCustomerSelection(record, {
		customerId: initialCustomerId,
		preserveExisting: true,
	}) as DealerSalesFormQuoteRecord;
}

export function composeDealerSalesFormQuoteSaveInput(input: {
	record: DealerSalesFormQuoteRecord;
	id?: number | null;
	customerProfileId?: number | null;
	lineTotalsByUid?: Record<string, number | undefined>;
	pricingContext?: {
		salesCoefficient?: number | null;
		dealerSalesPercentage?: number | null;
	} | null;
}): DealerSalesFormQuoteSaveInput | null {
	const customerId = input.record.form.customerId;
	if (!customerId) return null;

	return {
		id: input.id ?? null,
		customerId,
		customerProfileId:
			input.customerProfileId ?? input.record.form.customerProfileId ?? null,
		pricingContext: input.pricingContext ?? null,
		deliveryOption: input.record.form.deliveryOption || "pickup",
		goodUntil: input.record.form.goodUntil || null,
		paymentMethod: input.record.form.paymentMethod || null,
		paymentTerm: input.record.form.paymentTerm || "None",
		po: input.record.form.po || null,
		taxCode: input.record.form.taxCode || null,
		taxRate: Number(input.record.summary?.taxRate || 0),
		sellerOfRecord: input.record.form.sellerOfRecord || "DEALER",
		resaleCertificateOnFile: Boolean(input.record.form.resaleCertificateOnFile),
		lineItems: (input.record.lineItems || []).map((line) => {
			const qty = Number(line.qty || 0);
			const unitPrice = Number(line.unitPrice || 0);
			const fallbackLineTotal =
				line.lineTotal == null
					? multiplyMoney(qty, unitPrice)
					: roundMoney(Number(line.lineTotal));
			const structuredLineTotal = resolveDealerSalesFormStructuredLineTotal(
				line as SalesFormLineItemRecord & Record<string, unknown>,
			);

			return {
				uid: String(line.uid || ""),
				title: line.title || null,
				description: line.description || null,
				qty,
				unitPrice,
				lineTotal:
					structuredLineTotal ??
					input.lineTotalsByUid?.[String(line.uid || "")] ??
					fallbackLineTotal,
				taxxable: typeof line.taxxable === "boolean" ? line.taxxable : null,
				meta: safeObject(line.meta),
				formSteps: safeObjectArray(line.formSteps),
				shelfItems: safeObjectArray(line.shelfItems),
				housePackageTool: line.housePackageTool
					? safeObject(line.housePackageTool)
					: null,
			};
		}),
	};
}

export function composeDealerSalesFormQuotePricing(
	input: ComposeDealerSalesFormQuotePricingSnapshotInput,
): DualPricingSnapshot {
	const snapshot = composeSalesFormPricingSnapshot({
		config: {
			surface: "dealership",
			pricing: {
				mode: "percentage",
				internalProfile: withPricingLabel(input.internalProfile),
				dealerProfile: withPricingLabel(input.dealerProfile),
			},
		},
		lineItems: input.lineItems,
		extraCosts: input.extraCosts,
		taxRate: input.taxRate,
		paymentMethod: input.paymentMethod,
		cccPercentage: input.cccPercentage,
		createdAt: input.createdAt,
	}) as DualPricingSnapshot;

	if (input.sellerOfRecord !== "DEALER" || !input.resaleCertificateOnFile) {
		return snapshot;
	}

	return {
		...snapshot,
		internalPricing: {
			...snapshot.internalPricing,
			taxTotal: 0,
			grandTotal: snapshot.internalPricing.adjustedSubTotal,
		},
	};
}

/** @deprecated use composeDealerSalesFormQuotePricing. */
export const composeDealerSalesFormQuotePricingSnapshot =
	composeDealerSalesFormQuotePricing;
