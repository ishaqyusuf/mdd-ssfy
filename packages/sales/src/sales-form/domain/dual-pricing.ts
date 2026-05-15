import { calculateSalesFormSummary } from "./costing";

export type SalesFormPricingProfile = {
	id?: number | null;
	coefficient?: number | null;
	label?: string | null;
};

export type DualPricingLineInput = {
	uid: string;
	title?: string | null;
	qty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
	taxxable?: boolean | null;
	meta?: Record<string, unknown> | null;
	formSteps?: Array<Record<string, any>> | null;
};

export type DualPricingExtraCostInput = {
	type: string;
	amount?: number | null;
	taxxable?: boolean | null;
};

export type DualPricingInput = {
	lineItems: DualPricingLineInput[];
	extraCosts?: DualPricingExtraCostInput[];
	taxRate?: number | null;
	paymentMethod?: string | null;
	cccPercentage?: number | null;
	internalProfile?: SalesFormPricingProfile | null;
	dealerProfile?: SalesFormPricingProfile | null;
};

export type DualPricingLineResult = {
	uid: string;
	title: string | null;
	qty: number;
	internalUnitPrice: number;
	internalLineTotal: number;
	dealerUnitPrice: number;
	dealerLineTotal: number;
};

export type DualPricingResult = {
	internalProfileId: number | null;
	dealerProfileId: number | null;
	internalPricing: ReturnType<typeof calculateSalesFormSummary>;
	dealerPricing: ReturnType<typeof calculateSalesFormSummary>;
	lines: DualPricingLineResult[];
};

function roundCurrency(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function coefficient(profile?: SalesFormPricingProfile | null) {
	const value = Number(profile?.coefficient ?? 1);
	return Number.isFinite(value) && value > 0 ? value : 1;
}

function normalizeLine(line: DualPricingLineInput, nextCoefficient: number) {
	const qty = Number(line.qty ?? 0);
	const baseUnitPrice = Number(line.unitPrice ?? 0);
	const unitPrice = roundCurrency(baseUnitPrice * nextCoefficient);
	const lineTotal = roundCurrency(qty * unitPrice);

	return {
		...line,
		qty,
		unitPrice,
		lineTotal,
	};
}

export function calculateDualSalesFormPricing(
	input: DualPricingInput,
): DualPricingResult {
	const internalCoefficient = coefficient(input.internalProfile);
	const dealerCoefficient = coefficient(input.dealerProfile);

	const internalLines = (input.lineItems || []).map((line) =>
		normalizeLine(line, internalCoefficient),
	);
	const dealerLines = (input.lineItems || []).map((line) =>
		normalizeLine(line, dealerCoefficient),
	);

	return {
		internalProfileId: input.internalProfile?.id ?? null,
		dealerProfileId: input.dealerProfile?.id ?? null,
		internalPricing: calculateSalesFormSummary({
			strategy: "legacy",
			taxRate: input.taxRate,
			lineItems: internalLines,
			extraCosts: input.extraCosts,
			paymentMethod: input.paymentMethod,
			cccPercentage: input.cccPercentage,
		}),
		dealerPricing: calculateSalesFormSummary({
			strategy: "legacy",
			taxRate: input.taxRate,
			lineItems: dealerLines,
			extraCosts: input.extraCosts,
			paymentMethod: input.paymentMethod,
			cccPercentage: input.cccPercentage,
		}),
		lines: internalLines.map((internalLine, index) => {
			const dealerLine = dealerLines[index] || internalLine;

			return {
				uid: internalLine.uid,
				title: internalLine.title ?? null,
				qty: Number(internalLine.qty || 0),
				internalUnitPrice: Number(internalLine.unitPrice || 0),
				internalLineTotal: Number(internalLine.lineTotal || 0),
				dealerUnitPrice: Number(dealerLine.unitPrice || 0),
				dealerLineTotal: Number(dealerLine.lineTotal || 0),
			};
		}),
	};
}
