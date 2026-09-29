import {
	allocateDealerRowCents,
	dealerFormSteps,
} from "./dealer-item-projection";

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

/** Store moulding product groups in the relational format used by the office. */
export function buildDealerMouldingProjection(input: {
	uid: string;
	title?: string | null;
	meta?: Record<string, unknown> | null;
	formSteps?: Record<string, unknown>[] | null;
	internalLineTotal: number;
	itemIndex: number;
}) {
	const source = input.meta?.mouldingRows;
	if (!Array.isArray(source) || !source.length) return null;
	const rows = source.map((value) => {
		const row = record(value);
		const qty = Number(row.qty || 0);
		const unit = Number(
			row.unit ??
				Number(row.customPrice ?? row.salesPrice ?? 0) + Number(row.addon || 0),
		);
		const weight = Math.round(Number(row.lineTotal ?? qty * unit) * 100);
		if (
			!Number.isFinite(qty) ||
			qty < 0 ||
			!Number.isSafeInteger(weight) ||
			weight < 0
		)
			throw new Error(
				"Dealer moulding rows require valid quantities and prices.",
			);
		return { row, qty, weight };
	});
	const cents = allocateDealerRowCents(rows, input.internalLineTotal);
	const selections = (input.formSteps || []).flatMap((step) => {
		const selected = record(step.meta).selectedComponents;
		return Array.isArray(selected) ? selected.map(record) : [];
	});
	return {
		formSteps: dealerFormSteps(input.formSteps),
		items: rows.map(({ row, qty, weight }, index) => {
			const total = (cents[index] || 0) / 100;
			if (!qty && total)
				throw new Error("A priced moulding row requires a quantity.");
			const rate = qty ? total / qty : 0;
			const multiplier = weight ? (cents[index] || 0) / weight : 0;
			const addon = Math.round(Number(row.addon || 0) * multiplier * 100) / 100;
			const unitPrice = Math.round(rate * 100) / 100;
			const productPrice = Math.round((unitPrice - addon) * 100) / 100;
			const uid = String(row.uid || `${input.uid}-moulding-${index}`);
			const selection = selections.find((component) => component.uid === uid);
			const title = String(row.description || row.title || "Moulding");
			return {
				item: {
					description: title,
					dykeDescription: input.title || "Moulding",
					qty,
					rate,
					total,
					multiDykeUid: input.uid,
					multiDyke: index === 0,
					meta: {
						uid,
						title: input.title || "Moulding",
						meta: {
							itemIndex: input.itemIndex,
							// Only calculator context is read from these rows by the office loader.
							mouldingRows: [
								{
									uid,
									...(row.calculation ? { calculation: row.calculation } : {}),
								},
							],
						},
					},
				},
				housePackageTool: {
					doorType: "Moulding",
					totalPrice: total,
					totalDoors: 0,
					moldingId: Number(row.mouldingProductId || 0) || null,
					stepProductId:
						Number(row.stepProductId || selection?.id || 0) || null,
					meta: {
						priceTags: {
							moulding: {
								addon,
								basePrice: Number(row.basePrice ?? selection?.basePrice ?? 0),
								salesPrice: productPrice,
								overridePrice:
									row.customPrice == null || row.customPrice === ""
										? null
										: productPrice,
								price: unitPrice,
								dealerOfficeTotal: { qty, unitPrice, totalPrice: total },
								laborQty: row.laborQty ?? null,
								unitLabor: row.unitLabor ?? null,
							},
						},
					},
				},
			};
		}),
	};
}
