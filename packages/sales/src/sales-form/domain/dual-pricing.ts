import { calculateSalesFormSummary } from "./costing";

export type SalesFormPricingProfile = {
	id?: number | null;
	coefficient?: number | null;
	salesPercentage?: number | null;
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

export type DualPricingSnapshot = DualPricingResult & {
	source: "sales_form_dual_pricing";
	createdAt: string;
	profiles: {
		internal: {
			id: number | null;
			label: string | null;
			coefficient: number;
		};
		dealer: {
			id: number | null;
			label: string | null;
			salesPercentage: number;
		};
	};
};

function roundCurrency(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function coefficient(profile?: SalesFormPricingProfile | null) {
	const value = Number(profile?.coefficient ?? 1);
	return Number.isFinite(value) && value > 0 ? value : 1;
}

function percentage(profile?: SalesFormPricingProfile | null) {
	const value = Number(profile?.salesPercentage ?? 0);
	return Number.isFinite(value) ? value : 0;
}

function normalizeLine(line: DualPricingLineInput, multiplier: number) {
	const qty = Number(line.qty ?? 0);
	const baseUnitPrice = Number(line.unitPrice ?? 0);
	const unitPrice = roundCurrency(baseUnitPrice * multiplier);
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
	const dealerSalesPercentage = percentage(input.dealerProfile);
	const dealerMultiplier = internalCoefficient * (1 + dealerSalesPercentage / 100);

	const internalLines = (input.lineItems || []).map((line) =>
		normalizeLine(line, internalCoefficient),
	);
	const dealerLines = (input.lineItems || []).map((line) =>
		normalizeLine(line, dealerMultiplier),
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

export function buildDualSalesFormPricingSnapshot(
	input: DualPricingInput & {
		createdAt?: string | Date | null;
	},
): DualPricingSnapshot {
	const result = calculateDualSalesFormPricing(input);
	const createdAt =
		input.createdAt instanceof Date
			? input.createdAt.toISOString()
			: input.createdAt || new Date().toISOString();

	return {
		...result,
		source: "sales_form_dual_pricing",
		createdAt,
		profiles: {
			internal: {
				id: input.internalProfile?.id ?? null,
				label: input.internalProfile?.label ?? null,
				coefficient: coefficient(input.internalProfile),
			},
			dealer: {
				id: input.dealerProfile?.id ?? null,
				label: input.dealerProfile?.label ?? null,
				salesPercentage: percentage(input.dealerProfile),
			},
		},
	};
}
