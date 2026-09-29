import {
	allocateDealerRowCents,
	dealerFormSteps,
} from "./dealer-item-projection";

/** Persist shelf selections with office prices, leaving the customer recipe intact. */
export function buildDealerShelfProjection(input: {
	uid: string;
	shelfItems?: Record<string, unknown>[] | null;
	formSteps?: Record<string, unknown>[] | null;
	internalLineTotal: number;
}) {
	if (!input.shelfItems?.length) return null;
	const rows = input.shelfItems.map((row) => {
		const qty = Number(row.qty || 0);
		const weight = Math.round(
			Number(row.totalPrice ?? qty * Number(row.unitPrice || 0)) * 100,
		);
		if (
			!Number.isSafeInteger(qty) ||
			qty < 0 ||
			!Number.isSafeInteger(weight) ||
			weight < 0
		) {
			throw new Error("Dealer shelf rows require valid quantities and prices.");
		}
		return { row, qty, weight };
	});
	const cents = allocateDealerRowCents(rows, input.internalLineTotal);
	return {
		formSteps: dealerFormSteps(input.formSteps),
		shelfItems: rows.map(({ row, qty, weight }, index) => {
			const meta =
				row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
					? (row.meta as Record<string, unknown>)
					: {};
			const categoryIds = Array.isArray(meta.categoryIds)
				? meta.categoryIds
						.map(Number)
						.filter((id) => Number.isSafeInteger(id) && id > 0)
				: [];
			const categoryId = Number(row.categoryId || categoryIds.at(-1) || 0);
			if (!Number.isSafeInteger(categoryId) || categoryId <= 0)
				throw new Error("A dealer shelf row requires a category.");
			const totalPrice = (cents[index] || 0) / 100;
			if (!qty && totalPrice)
				throw new Error("A priced shelf row requires a quantity.");
			const unitPrice = qty ? Math.round((totalPrice / qty) * 100) / 100 : 0;
			const customPrice = meta.customPrice ?? row.customPrice;
			return {
				categoryId,
				productId: Number(row.productId || 0) || null,
				description: String(row.description || "") || null,
				qty,
				unitPrice,
				totalPrice,
				meta: {
					...meta,
					categoryIds: categoryIds.length ? categoryIds : [categoryId],
					categoryUid: (categoryIds.length ? categoryIds : [categoryId]).join(
						"-",
					),
					lineUid: String(
						meta.lineUid || meta.sectionUid || `${input.uid}-shelf`,
					),
					productUid: String(
						meta.productUid ||
							meta.productRowUid ||
							row.uid ||
							`${input.uid}-product-${index}`,
					),
					itemIndex: Number(meta.itemIndex ?? index),
					basePrice: Number(meta.basePrice ?? row.basePrice ?? 0),
					unitPrice,
					dealerOfficeTotal: { qty, unitPrice, totalPrice },
					salesPrice: weight
						? Math.round(
								((Number(
									meta.salesPrice ?? row.salesPrice ?? row.unitPrice ?? 0,
								) *
									(cents[index] || 0)) /
									weight) *
									100,
							) / 100
						: 0,
					customPrice:
						customPrice == null || customPrice === ""
							? null
							: weight
								? Math.round(
										((Number(customPrice) * (cents[index] || 0)) / weight) *
											100,
									) / 100
								: 0,
				},
			};
		}),
	};
}
