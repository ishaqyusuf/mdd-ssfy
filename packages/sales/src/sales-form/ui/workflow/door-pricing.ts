import {
	divideMoney,
	multiplyMoney,
} from "../../../payment-system/domain/money";

export function profileAdjustedDoorSalesPrice(
	salesPrice: number | null | undefined,
	basePrice: number | null | undefined,
	coefficient?: number | null,
) {
	const base = Number(basePrice);
	const sales = Number(salesPrice);
	const coeff = Number(coefficient || 0);
	if (Number.isFinite(base) && base > 0) {
		return Number.isFinite(coeff) && coeff > 0
			? divideMoney(base, coeff)
			: multiplyMoney(base, 1);
	}
	if (Number.isFinite(sales) && sales > 0) return sales;
	if (Number.isFinite(base) && base > 0) return base;
	return 0;
}
