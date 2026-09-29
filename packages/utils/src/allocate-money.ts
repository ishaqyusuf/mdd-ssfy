/** Allocate a money total across weighted rows using largest remainders. Returns cents. */
export function allocateMoneyByWeight(
	rows: { weight: number }[],
	total: number,
) {
	const totalCents = Math.round(total * 100);
	const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
	if (
		!Number.isSafeInteger(totalCents) ||
		totalCents < 0 ||
		(totalCents > 0 && totalWeight <= 0)
	) {
		throw new Error("Rows cannot reconcile to the target total.");
	}
	const amounts = rows.map(({ weight }) =>
		totalWeight ? Math.floor((totalCents * weight) / totalWeight) : 0,
	);
	const remainder =
		totalCents - amounts.reduce((sum, amount) => sum + amount, 0);
	const priority = rows
		.map(({ weight }, index) => ({
			index,
			fraction: totalWeight ? ((totalCents * weight) / totalWeight) % 1 : 0,
		}))
		.sort((a, b) => b.fraction - a.fraction);
	for (const entry of priority.slice(0, remainder)) {
		amounts[entry.index] = (amounts[entry.index] || 0) + 1;
	}
	return amounts;
}
