export type DispatchPackingTotalsInput = {
	ordered: number | string | null | undefined;
	listed: number | string | null | undefined;
	packed: number | string | null | undefined;
};

export function isCurrentDispatchPackingAllocation(input: {
	packingStatus?: string | null;
}) {
	return input.packingStatus !== "unpacked";
}

function quantity(
	value: DispatchPackingTotalsInput[keyof DispatchPackingTotalsInput],
) {
	const count = Number(value || 0);
	return Number.isFinite(count) ? Math.max(0, count) : 0;
}

/**
 * Resolves one packing denominator across unstarted, partially packed, and
 * completed dispatches. Listed quantity becomes authoritative once packing
 * starts; before that, ordered/remaining quantity is the target.
 */
export function resolveDispatchPackingTotals(
	input: DispatchPackingTotalsInput,
) {
	const packed = quantity(input.packed);
	const listed = quantity(input.listed);
	const ordered = quantity(input.ordered);
	const total = Math.max(packed, listed > 0 ? listed : ordered);

	return {
		packed,
		pending: Math.max(0, total - packed),
		total,
	};
}
