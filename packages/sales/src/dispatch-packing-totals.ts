export type DispatchPackingTotalsInput = {
	ordered: number | string | null | undefined;
	listed: number | string | null | undefined;
	packed: number | string | null | undefined;
	assigned?: number;
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
 * completed dispatches. Explicit assignment scope remains authoritative;
 * legacy dispatches use listed quantity after packing starts.
 */
export function resolveDispatchPackingTotals(
	input: DispatchPackingTotalsInput,
) {
	const packed = quantity(input.packed);
	const listed = quantity(input.listed);
	const ordered = quantity(input.ordered);
	const total = input.assigned !== undefined
		? Math.max(packed, quantity(input.assigned))
		: Math.max(packed, listed > 0 ? listed : ordered);

	return {
		packed,
		pending: Math.max(0, total - packed),
		total,
	};
}
