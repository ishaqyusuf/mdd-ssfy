const SALES_QUOTE_SORT_FIELDS = new Set(["orderId", "createdAt", "grandTotal"]);
const SORT_DIRECTIONS = new Set(["asc", "desc"]);

export function normalizeSalesQuoteSort(sort?: string[] | null) {
	const normalized =
		sort?.filter((entry) => {
			const [field, direction = "desc"] = entry.split(".");

			return (
				SALES_QUOTE_SORT_FIELDS.has(field) && SORT_DIRECTIONS.has(direction)
			);
		}) ?? [];

	return normalized.length > 0 ? normalized : null;
}
