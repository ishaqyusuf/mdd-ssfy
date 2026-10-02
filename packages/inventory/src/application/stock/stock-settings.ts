export function readCategoryStockSettings(meta: unknown): {
	lowStockAlert: number;
	piecesPerUnit: number;
	promptAvailableStock: boolean;
	stockUnit: "unit" | "kit" | "length" | null;
} {
	const root =
		meta && typeof meta === "object" && !Array.isArray(meta)
			? (meta as Record<string, unknown>)
			: {};
	const value =
		root.stockSettings && typeof root.stockSettings === "object"
			? (root.stockSettings as Record<string, unknown>)
			: {};
	const threshold = value.lowStockAlert;
	return {
		piecesPerUnit:
			typeof value.piecesPerUnit === "number" &&
			Number.isInteger(value.piecesPerUnit) &&
			value.piecesPerUnit > 0 &&
			value.piecesPerUnit <= 10000
				? value.piecesPerUnit
				: 1,
		lowStockAlert:
			typeof threshold === "number" &&
			Number.isInteger(threshold) &&
			threshold >= 0
				? threshold
				: 0,
		promptAvailableStock: value.promptAvailableStock === true,
		stockUnit:
			value.stockUnit === "unit" ||
			value.stockUnit === "kit" ||
			value.stockUnit === "length"
				? value.stockUnit
				: null,
	};
}
