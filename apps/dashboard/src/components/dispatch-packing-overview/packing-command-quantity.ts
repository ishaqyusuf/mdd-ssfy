import { recomposeQty } from "@sales/utils/sales-control";

export function toPackingCommandQuantity(input: {
	qty?: number | null;
	lh?: number | null;
	rh?: number | null;
}) {
	const normalized = recomposeQty({
		qty: Number(input.qty || 0),
		lh: Number(input.lh || 0),
		rh: Number(input.rh || 0),
	});
	const lh = Number(normalized.lh || 0);
	const rh = Number(normalized.rh || 0);

	return {
		qty: lh > 0 || rh > 0 ? 0 : Number(normalized.qty || 0),
		lh,
		rh,
	};
}
