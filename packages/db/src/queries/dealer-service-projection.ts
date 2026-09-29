import {
	allocateDealerRowCents,
	dealerFormSteps,
} from "./dealer-item-projection";
function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

/** Project the dealer's service recipe into office-priced relational rows. */
export function buildDealerServiceItemProjection(input: {
	uid: string;
	title?: string | null;
	meta?: Record<string, unknown> | null;
	formSteps?: Record<string, unknown>[] | null;
	internalLineTotal: number;
	itemIndex: number;
}) {
	const sourceRows = input.meta?.serviceRows;
	if (!Array.isArray(sourceRows) || !sourceRows.length) return null;
	const rows = sourceRows.map((value) => {
		const row = record(value);
		const qty = Number(row.qty || 0);
		const weight = Math.round(
			Number(row.lineTotal ?? qty * Number(row.unitPrice || 0)) * 100,
		);
		if (
			!Number.isFinite(qty) ||
			qty < 0 ||
			!Number.isSafeInteger(weight) ||
			weight < 0
		) {
			throw new Error(
				"Dealer service rows require valid quantities and prices.",
			);
		}
		return { row, qty, weight };
	});
	const amounts = allocateDealerRowCents(rows, input.internalLineTotal);
	return {
		items: rows.map(({ row, qty }, index) => {
			const total = (amounts[index] || 0) / 100;
			if (!qty && total)
				throw new Error("A priced service row requires a quantity.");
			return {
				description: String(row.service || row.description || "").trim(),
				dykeDescription: input.title || "Services",
				qty,
				rate: qty ? total / qty : 0,
				total,
				multiDykeUid: input.uid,
				multiDyke: index === 0,
				dykeProduction: Boolean(row.produceable),
				meta: {
					uid: String(row.uid || `${input.uid}-service-${index + 1}`),
					title: input.title || "Services",
					tax: Boolean(row.taxxable),
					meta: { itemIndex: input.itemIndex },
				},
			};
		}),
		formSteps: dealerFormSteps(input.formSteps),
	};
}
