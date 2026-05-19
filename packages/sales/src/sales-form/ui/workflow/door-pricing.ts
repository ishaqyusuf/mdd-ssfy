export function profileAdjustedDoorSalesPrice(
	salesPrice: number | null | undefined,
	basePrice: number | null | undefined,
	coefficient?: number | null,
) {
	const base = Number(basePrice);
	const sales = Number(salesPrice);
	const coeff = Number(coefficient || 0);
	const multiplier =
		Number.isFinite(coeff) && coeff > 0 ? Number((1 / coeff).toFixed(2)) : 1;
	if (
		Number.isFinite(base) &&
		base > 0 &&
		Number.isFinite(multiplier) &&
		multiplier > 0
	) {
		return Number((base * multiplier).toFixed(2));
	}
	if (Number.isFinite(sales) && sales > 0) return sales;
	if (Number.isFinite(base) && base > 0) return base;
	return 0;
}
