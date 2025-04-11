import { sum } from "@/lib/utils";

export interface Qty {
    lh?;
    rh?;
    qty?;
    noHandle?: boolean;
}

export const composeQtyMatrix = (rh, lh, qty) => {
    if (!qty) sum([rh, lh]);
    return { rh, lh, qty, noHandle: !rh && !lh };
};
export function qtyMatrixDifference(a: Qty, b: Qty) {
    let res: Qty = {
        noHandle: a.noHandle,
    };
    ["rh", "lh", "qty"].map((k) => (res[k] = sum([a[k], b[k] * -1])));
    return res;
}
export function qtyMatrixSum(...qties: Qty[]) {
    let res: Qty = {
        noHandle: qties?.[0].noHandle,
    };
    qties?.map((a) => {
        ["rh", "lh", "qty"].map((k) => (res[k] = sum([a[k], res[k]])));
        return res;
    });
    return res;
}
