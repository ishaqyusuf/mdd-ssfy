import { sum } from "@/lib/utils";

export interface Qty {
	lh?;
	rh?;
	qty?;
	noHandle?: boolean;
}

export function qtyMatrixDifference(a: Qty, b: Qty) {
	const res: Qty = {
		noHandle: a.noHandle,
	};
	for (const key of ["rh", "lh", "qty"] as const) {
		res[key] = sum([a[key], b[key] * -1]);
	}
	return res;
}
export function transformQtyHandle({ lhQty: lh, rhQty: rh, qty }): Qty {
	return { lh, rh, qty };
}
