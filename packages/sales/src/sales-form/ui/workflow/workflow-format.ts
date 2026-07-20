import {
	divideMoney,
	multiplyMoney,
} from "../../../payment-system/domain/money";

export function money(value?: number | null) {
	const amount = Number(value || 0);
	if (!Number.isFinite(amount) || amount <= 0) return null;
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount);
}

export function moneyIfPositive(value?: number | null) {
	const amount = Number(value ?? 0);
	if (!Number.isFinite(amount) || amount <= 0) return null;
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount);
}

export function middleTruncateText(value?: string | null, maxLength = 24) {
	const text = String(value || "").trim();
	if (text.length <= maxLength) return text;
	if (maxLength <= 3) return ".".repeat(Math.max(0, maxLength));

	const visibleLength = maxLength - 3;
	const leadingLength = Math.ceil(visibleLength / 2);
	const trailingLength = Math.floor(visibleLength / 2);

	return `${text.slice(0, leadingLength)}...${text.slice(
		text.length - trailingLength,
	)}`;
}

export function profileAdjustedSalesPrice(
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
