import { normalizeSalesPriority } from "@sales/priority";

export const productionCalendarColors = {
	unassigned:
		"bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200",
	assigned:
		"bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-200",
	"in progress":
		"bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200",
	completed:
		"bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-200",
	conflict:
		"bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-200",
	unknown:
		"bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-900/30 dark:border-slate-600 dark:text-slate-200",
} as const;

export type ProductionCalendarTone = keyof typeof productionCalendarColors;

export const criticalStatusBorders: Record<ProductionCalendarTone, string> = {
	unassigned: "border-amber-300",
	assigned: "border-purple-300",
	"in progress": "border-blue-300",
	completed: "border-emerald-300",
	conflict: "border-rose-300",
	unknown: "border-slate-300",
};

export const criticalCalendarSurface =
	"bg-red-700/90 text-white dark:bg-red-800/80 dark:text-white [&_button]:text-current";

export function productionCalendarCardClasses(
	tone: string,
	priority?: string | null,
) {
	const resolvedTone: ProductionCalendarTone =
		tone in productionCalendarColors
			? (tone as ProductionCalendarTone)
			: "unknown";

	if (normalizeSalesPriority(priority) === "CRITICAL") {
		return `border-2 ${criticalCalendarSurface} ${criticalStatusBorders[resolvedTone]}`;
	}

	return `border-2 ${productionCalendarColors[resolvedTone]}`;
}
