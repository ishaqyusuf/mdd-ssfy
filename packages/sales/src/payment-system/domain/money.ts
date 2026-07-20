import Decimal, { type Numeric } from "decimal.js-light";

export type MoneyValue = Numeric | null | undefined;

function decimal(value: MoneyValue) {
	if (value == null || value === "") return new Decimal(0);
	try {
		return new Decimal(value);
	} catch {
		return new Decimal(0);
	}
}

export function roundMoney(value: MoneyValue) {
	return decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

export function addMoney(...values: MoneyValue[]) {
	return roundMoney(
		values.reduce<Decimal>(
			(total, value) => total.plus(decimal(value)),
			new Decimal(0),
		),
	);
}

export function subtractMoney(value: MoneyValue, ...subtrahends: MoneyValue[]) {
	return roundMoney(
		subtrahends.reduce<Decimal>(
			(total, subtrahend) => total.minus(decimal(subtrahend)),
			decimal(value),
		),
	);
}

export function multiplyMoney(...values: MoneyValue[]) {
	if (!values.length) return 0;
	return roundMoney(
		values.reduce<Decimal>(
			(total, value) => total.times(decimal(value)),
			new Decimal(1),
		),
	);
}

export function moneyRatio(value: MoneyValue, divisor: MoneyValue) {
	const denominator = decimal(divisor);
	if (denominator.isZero()) return 0;
	return decimal(value).dividedBy(denominator).toNumber();
}

export function divideMoney(value: MoneyValue, divisor: MoneyValue) {
	return roundMoney(moneyRatio(value, divisor));
}

export function percentageMoney(value: MoneyValue, percentage: MoneyValue) {
	return roundMoney(decimal(value).times(decimal(percentage)).dividedBy(100));
}

export function sumMoney(values: MoneyValue[]) {
	return addMoney(...values);
}
