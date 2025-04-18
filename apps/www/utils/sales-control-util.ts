import {
    QtyControlType,
    SalesDispatchStatus,
} from "@/app/(clean-code)/(sales)/types";
import { sum } from "@/lib/utils";
import { Prisma } from "@prisma/client";

export interface Qty {
    lh?;
    rh?;
    qty?;
    noHandle?: boolean;
}

export const composeQtyMatrix = (rh, lh, qty) => {
    if (!qty || rh || lh) qty = sum([rh, lh]);
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
    if (!qties) return {};
    let res: Qty = {
        noHandle: qties?.[0]?.noHandle,
    };
    qties?.map((a) => {
        ["rh", "lh", "qty"].map((k) => (res[k] = sum([a[k], res[k]])));
        return res;
    });
    return res;
}
export function transformQtyHandle({ lhQty: lh, rhQty: rh, qty }): Qty {
    return { lh, rh, qty };
}
export function negativeQty({ lh, rh, qty, ...rest }: Qty): Qty {
    return {
        ...rest,
        lh: lh * -1,
        rh: rh * -1,
        qty: qty * -1,
    };
}
export function composeSalesItemControlStat(uid, qty: Qty, _order) {
    const order = _order as Prisma.SalesOrdersGetPayload<{
        select: {
            deliveries: {
                select: {
                    status: true;
                    items: true;
                };
            };
            assignments: {
                select: {
                    qtyAssigned: true;
                    lhQty: true;
                    rhQty: true;
                    salesItemControlUid: true;
                    submissions: {
                        select: {
                            id: true;
                            qty: true;
                            lhQty: true;
                            rhQty: true;
                        };
                    };
                };
            };
        };
    }>;
    const assignments = order.assignments.filter(
        (a) => a.salesItemControlUid == uid,
    );
    const assigned = qtyMatrixSum(
        ...assignments.map(({ lhQty: lh, rhQty: rh, qtyAssigned: qty }) => ({
            lh,
            rh,
            qty,
        })),
    );
    const submitted = qtyMatrixSum(
        ...assignments
            .map((a) =>
                a.submissions.map(({ lhQty: lh, rhQty: rh, qty }) => ({
                    lh,
                    rh,
                    qty,
                })),
            )
            .flat(),
    );
    const pendingAssignment = qtyMatrixDifference(qty, assigned);
    const pendingProduction = qtyMatrixDifference(assigned, submitted);
    const submissionIds = assignments
        .map((a) => a.submissions.map((s) => s.id))
        .flat();
    const deliveries = order.deliveries
        .map((d) =>
            d.items
                .map(
                    ({
                        qty,
                        lhQty: lh,
                        rhQty: rh,
                        orderProductionSubmissionId,
                    }) => ({
                        qty,
                        lh,
                        rh,
                        status: d.status as SalesDispatchStatus,
                        orderProductionSubmissionId,
                    }),
                )
                .filter((a) =>
                    submissionIds.includes(a.orderProductionSubmissionId),
                ),
        )
        .flat();
    const dispatch = {
        queued: qtyMatrixSum(
            deliveries.filter((a) => a.status == "queue") as any,
        ),
        inProgress: qtyMatrixSum(
            deliveries.filter((a) => a.status == "in progress") as any,
        ),
        completed: qtyMatrixSum(
            deliveries.filter((a) => a.status == "completed") as any,
        ),
        cancelled: qtyMatrixSum(
            deliveries.filter((a) => a.status == "cancelled") as any,
        ),
    };
    const pendingDispatch = qtyMatrixDifference(
        qty,
        qtyMatrixSum(dispatch.queued, dispatch.inProgress, dispatch.completed),
    );
    const availableDispatch = qtyMatrixDifference(
        submitted,
        qtyMatrixSum(dispatch.queued, dispatch.inProgress, dispatch.completed),
    );
    const stats = {
        qty,
        prodAssigned: assigned,
        prodCompleted: submitted,
        dispatchAssigned: dispatch.queued,
        dispatchCancelled: dispatch.cancelled,
        dispatchCompleted: dispatch.completed,
        dispatchInProgress: dispatch.inProgress,
    } as { [k in QtyControlType]: Qty };
    return {
        stats,
        assignment: {
            pending: pendingAssignment,
        },
        production: {
            pending: pendingProduction,
        },
        dispatch: {
            pending: pendingDispatch,
            available: availableDispatch,
        },
    };
}
