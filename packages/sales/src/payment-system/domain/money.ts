export function roundMoney(value: number | null | undefined) {
	const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
	return Math.round(amount * 100) / 100;
}

export function sumMoney(values: Array<number | null | undefined>) {
	return roundMoney(
		values.reduce<number>((total, value) => total + roundMoney(value), 0),
	);
}
