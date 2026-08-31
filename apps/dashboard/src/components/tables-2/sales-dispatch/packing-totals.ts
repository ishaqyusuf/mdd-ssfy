import { resolveDispatchPackingTotals } from "@gnd/sales/dispatch-packing-totals";

type PackingTotal = {
	total?: number | string | null;
};

type PackingControl = {
	packed?: PackingTotal | null;
	pendingPacking?: PackingTotal | null;
};

export type DispatchPackingTotalsSource = {
	control?: PackingControl | null;
	statistic?: PackingControl | null;
	order?: {
		control?: PackingControl | null;
	} | null;
};

export function getDispatchPackingTotals(source: DispatchPackingTotalsSource) {
	const dispatchControl = source.control ?? source.statistic;
	if (!dispatchControl) {
		const orderPacked = Number(source.order?.control?.packed?.total || 0);
		const orderPending = Number(
			source.order?.control?.pendingPacking?.total || 0,
		);
		return resolveDispatchPackingTotals({
			ordered: orderPacked + orderPending,
			listed: orderPacked + orderPending,
			packed: orderPacked,
		});
	}

	const packed = Number(dispatchControl.packed?.total || 0);
	const pending = Number(dispatchControl.pendingPacking?.total || 0);
	return resolveDispatchPackingTotals({
		ordered:
			packed + Number(source.order?.control?.pendingPacking?.total || 0),
		listed: packed + pending,
		packed,
	});
}
