import { SALES_DELIVERY_OPTIONS } from "@gnd/utils/sales";

export type SalesFormSelectOption = {
	value: string;
	label: string;
};

export type SalesFormProfileOptionRecord = {
	id?: string | number | null;
	title?: string | null;
	meta?: Record<string, any> | null;
	coefficient?: number | null;
};

export type SalesFormTaxOptionRecord = {
	taxCode: string;
	title: string;
	percentage: number;
};

export const salesFormPaymentTerms = [
	"None",
	"Due on Receipt",
	"Net 7",
	"Net 10",
	"Net 15",
	"Net 20",
	"Net 30",
	"Net 60",
];

function paymentTermKey(value?: string | null) {
	return String(value ?? "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
}

export const salesFormDeliveryOptions = SALES_DELIVERY_OPTIONS.filter(
	(option) => option !== "ship",
);

export const salesFormPaymentMethods = [
	"None",
	"Cash",
	"Check",
	"Credit Card",
	"ACH",
	"Link",
	"Wire Transfer",
	"Zelle",
];

export function normalizeSalesFormPaymentTerm(
	value?: string | null,
	fallback: string | null = "None",
) {
	const rawValue = String(value ?? "").trim();
	if (rawValue) {
		const canonical = salesFormPaymentTerms.find(
			(term) => paymentTermKey(term) === paymentTermKey(rawValue),
		);
		return canonical || rawValue;
	}

	const rawFallback = String(fallback ?? "").trim();
	if (!rawFallback) return "None";
	return (
		salesFormPaymentTerms.find(
			(term) => paymentTermKey(term) === paymentTermKey(rawFallback),
		) || rawFallback
	);
}

export function resolveSalesFormProfilePaymentTerm(
	meta?: Record<string, any> | null,
	fallback?: string | null,
) {
	return normalizeSalesFormPaymentTerm(
		meta?.netTerm ?? meta?.net ?? meta?.paymentTerm ?? null,
		fallback,
	);
}

export function buildSalesFormSelectOptions(
	values: string[],
): SalesFormSelectOption[] {
	return values.map((value) => ({
		value,
		label: value,
	}));
}

export function normalizeSalesFormTaxOptions(
	taxes: unknown[],
): SalesFormTaxOptionRecord[] {
	return (taxes || []).map((tax: any) => ({
		taxCode: String(tax?.taxCode || ""),
		title: String(tax?.title || tax?.taxCode || "Tax"),
		percentage: Number(tax?.percentage ?? tax?.tax ?? tax?.rate ?? 0),
	}));
}

export function buildSalesFormProfileSelectOptions(
	profiles: SalesFormProfileOptionRecord[],
): SalesFormSelectOption[] {
	return [
		{ value: "none", label: "None" },
		...(profiles || []).map((profile) => ({
			value: String(profile.id),
			label: String(profile.title || profile.id),
		})),
	];
}

export function buildSalesFormTaxSelectOptions(
	taxes: SalesFormTaxOptionRecord[],
): SalesFormSelectOption[] {
	return [
		{ value: "none", label: "Tax Exempt" },
		...(taxes || []).map((tax) => ({
			value: tax.taxCode,
			label:
				Number(tax.percentage || 0) > 0
					? `${tax.title} (${tax.percentage}%)`
					: tax.title,
		})),
	];
}

export function resolveSalesFormTaxRateByCode(
	taxes: SalesFormTaxOptionRecord[],
	taxCode?: string | null,
) {
	if (!taxCode) return 0;
	const match = (taxes || []).find((tax) => tax.taxCode === taxCode);
	return Number(match?.percentage || 0);
}

function normalizeProfileTitle(value?: string | null) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

export function getDefaultSalesFormCustomerProfile<
	TProfile extends SalesFormProfileOptionRecord,
>(profiles: TProfile[]) {
	if (!Array.isArray(profiles) || !profiles.length) return null;
	return (
		profiles.find(
			(profile) => normalizeProfileTitle(profile?.title) === "tier 1",
		) ||
		profiles.find((profile) => {
			const meta = profile?.meta || {};
			return Boolean(
				meta?.isDefault || meta?.default || meta?.selected || meta?.is_default,
			);
		}) ||
		profiles[0] ||
		null
	);
}
