export type StockStatus =
	| "available"
	| "low_stock"
	| "out_of_stock"
	| "mixed"
	| "alerts_off";

export function summarizeStockVariants(
	variants: { alertsEnabled: boolean; level: string }[],
): StockStatus {
	const enabled = variants.filter((variant) => variant.alertsEnabled);
	if (!enabled.length) return "alerts_off";
	if (enabled.every((variant) => variant.level === "available"))
		return "available";
	if (enabled.every((variant) => variant.level === "out_of_stock"))
		return "out_of_stock";
	if (enabled.every((variant) => variant.level === "low_stock"))
		return "low_stock";
	return "mixed";
}
