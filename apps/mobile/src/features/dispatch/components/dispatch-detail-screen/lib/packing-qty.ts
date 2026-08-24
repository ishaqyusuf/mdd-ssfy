import { buildPackAllTarget } from "@gnd/sales/dispatch-packing-plan";

type QtyMatrix = {
	qty?: number | null;
	lh?: number | null;
	rh?: number | null;
	noHandle?: boolean | null;
};

function asNumber(v?: number | null) {
	return Number(v || 0);
}

export function recomposeQty(qty?: QtyMatrix | null) {
	const lh = asNumber(qty?.lh);
	const rh = asNumber(qty?.rh);
	const noHandle = lh <= 0 && rh <= 0;
	return {
		lh,
		rh,
		qty: noHandle ? asNumber(qty?.qty) : lh + rh,
		noHandle,
	};
}

export function qtyTotal(qty?: QtyMatrix | null) {
	return recomposeQty(qty).qty;
}

export function getPackTargetQty(item: any) {
	const explicitNoHandle =
		(item?.totalQty as any)?.noHandle ??
		(item?.deliverableQty as any)?.noHandle ??
		(item?.availableQty as any)?.noHandle;
	const target = buildPackAllTarget(
		{
			totalQty: item?.totalQty,
			availableQty: item?.availableQty,
			deliverableQty: item?.deliverableQty,
			listedQty: item?.listedQty,
			deliverables: item?.deliverables,
		},
		explicitNoHandle === true,
	);
	return {
		...target,
		noHandle: explicitNoHandle === true || (target.lh <= 0 && target.rh <= 0),
	};
}

export function itemHasSingleQty(item: any) {
	const explicitNoHandle = (item?.totalQty as any)?.noHandle;
	if (typeof explicitNoHandle === "boolean") return explicitNoHandle;
	return !!getPackTargetQty(item).noHandle;
}
