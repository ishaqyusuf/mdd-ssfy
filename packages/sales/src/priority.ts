import { z } from "zod";

export const SALES_PRIORITY_VALUES = [
	"CRITICAL",
	"HIGH",
	"NORMAL",
	"LOW",
] as const;

export type SalesPriorityValue = (typeof SALES_PRIORITY_VALUES)[number];

export const salesPrioritySchema = z.enum(SALES_PRIORITY_VALUES);

export const SALES_PRIORITY_OPTIONS: {
	value: SalesPriorityValue;
	label: string;
	rank: number;
	color: string;
}[] = [
	{ value: "CRITICAL", label: "Critical", rank: 0, color: "#dc2626" },
	{ value: "HIGH", label: "High", rank: 1, color: "#d97706" },
	{ value: "NORMAL", label: "Normal", rank: 2, color: "#71717a" },
	{ value: "LOW", label: "Low", rank: 3, color: "#64748b" },
];

const priorityByValue = new Map(
	SALES_PRIORITY_OPTIONS.map((option) => [option.value, option]),
);

export function normalizeSalesPriority(
	priority?: string | null,
): SalesPriorityValue {
	return salesPrioritySchema.safeParse(priority).success
		? (priority as SalesPriorityValue)
		: "NORMAL";
}

export function getSalesPriorityLabel(priority?: string | null) {
	return priorityByValue.get(normalizeSalesPriority(priority))?.label || "Normal";
}

export function getSalesPriorityRank(priority?: string | null) {
	return priorityByValue.get(normalizeSalesPriority(priority))?.rank ?? 2;
}
