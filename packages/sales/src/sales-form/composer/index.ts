import {
	computeNormalizedSalesFormSummary,
	hydrateSalesFormRecord,
	normalizeSalesFormExtraCosts,
	normalizeSalesFormLineItems,
	toSalesFormSaveDraftPayload,
	type SalesFormExtraCostRecord,
	type SalesFormLineItemRecord,
	type SalesFormSummaryRecord,
} from "../application";
import {
	buildDualSalesFormPricingSnapshot,
	type DualPricingSnapshot,
	type SalesFormPricingProfile,
} from "../domain";

export type SalesFormComposerSurface = "www" | "dealership";

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

export type SalesFormComposerRecord = Record<string, any> & {
	type?: "order" | "quote" | string | null;
	salesId?: number | null;
	slug?: string | null;
	inventoryStatus?: string | null;
	version?: string | null;
	form?: Record<string, any> | null;
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

function normalizeCoefficient(profile?: SalesFormPricingProfile | null) {
	const value = Number(profile?.coefficient ?? 1);
	return Number.isFinite(value) && value > 0 ? value : 1;
}

export function composeSalesFormRecord<
	TRecord extends SalesFormComposerRecord,
>(record: TRecord, _config?: SalesFormComposerConfig): TRecord {
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
			const unitPrice = Number(
				(Number(line.unitPrice || 0) * coefficient).toFixed(2),
			);
			return {
				...line,
				qty,
				unitPrice,
				lineTotal: Number((qty * unitPrice).toFixed(2)),
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
