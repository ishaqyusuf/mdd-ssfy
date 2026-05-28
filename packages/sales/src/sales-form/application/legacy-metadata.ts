import type {
	SalesFormExtraCostRecord,
	SalesFormMetaRecord,
	SalesFormSummaryRecord,
} from "./record-normalization";

export type LegacySalesFormMetaContainer = Record<string, unknown> & {
	newSalesForm?: {
		form?: Partial<SalesFormMetaRecord> | null;
	} | null;
};

export type LegacySalesOrderDates = {
	createdAt?: Date | string | null;
	paymentDueDate?: Date | string | null;
	goodUntil?: Date | string | null;
	prodDueDate?: Date | string | null;
};

function safeRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return value as Record<string, unknown>;
}

function toIsoDate(value: unknown): string | null {
	if (value == null || value === "") return null;
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value.toISOString();
	}
	if (typeof value !== "string" && typeof value !== "number") return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function finiteNumber(value: unknown, fallback = 0) {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
}

function firstString(...values: unknown[]) {
	for (const value of values) {
		if (typeof value === "string" && value.trim()) return value;
	}
	return null;
}

function firstDefined<T>(...values: Array<T | null | undefined>) {
	for (const value of values) {
		if (value !== undefined && value !== null) return value;
	}
	return null;
}

function sumExtraCostsByType(
	extraCosts: Partial<SalesFormExtraCostRecord>[] | undefined,
	types: string[],
) {
	const normalizedTypes = new Set(types.map((type) => type.toLowerCase()));
	return (extraCosts || []).reduce((total, cost) => {
		const type = String(cost.type || "").toLowerCase();
		if (!normalizedTypes.has(type)) return total;
		return total + finiteNumber(cost.amount);
	}, 0);
}

export function calculateLegacyPaymentDueDate(
	paymentTerm?: string | null,
	createdAt?: Date | string | null,
) {
	if (!paymentTerm || paymentTerm === "None") return null;
	const days = Number(paymentTerm.toLowerCase().replace("net", "").trim());
	if (!Number.isFinite(days)) return null;
	const date = createdAt ? new Date(createdAt) : new Date();
	if (Number.isNaN(date.getTime())) return null;
	date.setDate(date.getDate() + days);
	return date.toISOString();
}

export function readLegacySalesFormMeta(input: {
	meta?: LegacySalesFormMetaContainer | null;
	persistedForm?: Partial<SalesFormMetaRecord> | null;
	order?: LegacySalesOrderDates & {
		paymentTerm?: string | null;
		deliveryOption?: string | null;
	};
	defaults?: {
		paymentTerm?: string;
		deliveryOption?: string;
	};
}): Partial<SalesFormMetaRecord> {
	const legacyMeta = safeRecord(input.meta);
	const persistedForm = safeRecord(input.persistedForm);
	const order = input.order || {};
	const paymentTerm = firstString(
		order.paymentTerm,
		persistedForm.paymentTerm,
		input.defaults?.paymentTerm,
	);
	const createdAt = toIsoDate(
		firstDefined(order.createdAt, persistedForm.createdAt),
	);
	const paymentDueDate =
		toIsoDate(
			firstDefined(order.paymentDueDate, persistedForm.paymentDueDate),
		) || calculateLegacyPaymentDueDate(paymentTerm, createdAt);

	return {
		...persistedForm,
		paymentTerm: paymentTerm || input.defaults?.paymentTerm || "None",
		paymentMethod: firstString(
			legacyMeta.payment_option,
			persistedForm.paymentMethod,
		),
		createdAt,
		paymentDueDate,
		goodUntil: toIsoDate(
			firstDefined(order.goodUntil, persistedForm.goodUntil),
		),
		prodDueDate: toIsoDate(
			firstDefined(order.prodDueDate, persistedForm.prodDueDate),
		),
		po: firstString(legacyMeta.po, persistedForm.po) || "",
		deliveryOption:
			firstString(
				order.deliveryOption,
				persistedForm.deliveryOption,
				input.defaults?.deliveryOption,
			) ||
			input.defaults?.deliveryOption ||
			"pickup",
	};
}

export function projectSalesFormMetaToLegacyMeta(input: {
	existingMeta?: LegacySalesFormMetaContainer | null;
	form: Partial<SalesFormMetaRecord>;
	summary?: Partial<SalesFormSummaryRecord> | null;
	extraCosts?: Partial<SalesFormExtraCostRecord>[];
	cccPercentage?: number | null;
	paymentMethodReviewDismissed?: boolean | null;
}) {
	const existingMeta = safeRecord(input.existingMeta);
	const {
		sales_percentage: legacySalesPercentage,
		...existingMetaWithoutDeprecated
	} = existingMeta;
	const form = input.form || {};
	const summary = input.summary || {};
	const delivery = firstDefined(
		summary.delivery,
		sumExtraCostsByType(input.extraCosts, ["Delivery"]),
	);
	const labor = firstDefined(
		summary.labor,
		sumExtraCostsByType(input.extraCosts, ["Labor", "FlatLabor"]),
	);
	const paymentMethodReviewDismissed = firstDefined(
		input.paymentMethodReviewDismissed,
		existingMeta.paymentMethodReviewDismissed as boolean | null | undefined,
	);
	const salesCoefficient = firstDefined(
		form.salesCoefficient as number | string | null | undefined,
		existingMeta.salesCoefficient as number | string | null | undefined,
		legacySalesPercentage as number | string | null | undefined,
	);

	return {
		...existingMetaWithoutDeprecated,
		...(salesCoefficient == null
			? {}
			: { salesCoefficient: finiteNumber(salesCoefficient) }),
		ccc: finiteNumber(summary.ccc),
		ccc_percentage: finiteNumber(
			input.cccPercentage ?? existingMeta.ccc_percentage,
			3.5,
		),
		discount: finiteNumber(summary.discount),
		deliveryCost: finiteNumber(delivery),
		labor_cost: finiteNumber(labor),
		po: form.po || null,
		qb: existingMeta.qb ?? null,
		payment_option: form.paymentMethod || null,
		paymentMethodReviewDismissed,
		laborConfig: existingMeta.laborConfig ?? null,
	};
}
