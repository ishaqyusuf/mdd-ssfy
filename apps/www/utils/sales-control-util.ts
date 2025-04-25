import { ItemControlData } from "@/actions/get-sales-items-overview-action";
import { generateItemControlUid } from "@/app/(clean-code)/(sales)/_common/utils/item-control-utils";
import {
    QtyControlType,
    SalesDispatchStatus,
} from "@/app/(clean-code)/(sales)/types";
import { Prisma } from "@/db";
import { sum } from "@/lib/utils";

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
export function composeSalesItemControlStat(
    // uid,
    // qty: Qty,
    item: ItemControlData,
    _order,
    // { production, shipping },
) {
    const {
        controlUid: uid,
        qty,
        itemConfig: { production },
        doorId,
        hptId,
        dim,
        itemId,
    } = item;
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
                    id: true;
                    itemId: true;
                    shelfItemId: true;
                    salesDoorId: true;
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
    const assignments = order.assignments
        .filter((a) => a.itemId == item.itemId)
        .filter((a) => {
            if (!a.salesItemControlUid)
                a.salesItemControlUid = generateItemControlUid({
                    shelfId: a.shelfItemId,
                    itemId: a.itemId,
                    doorId: a.salesDoorId,
                    hptId: item.hptId,
                    dim: item.dim,
                });
            return a.salesItemControlUid == item.controlUid;
        });
    // console.log({ assignments, aa: order.assignments });
    // throw new Error("...");
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
    const deliverables = assignments
        .map((assignment) => {
            return assignment.submissions.map((s) => {
                let submitted = transformQtyHandle(s);
                const delivered = qtyMatrixSum(
                    ...order.deliveries
                        .filter(
                            (d) =>
                                (d.status as SalesDispatchStatus) !==
                                "cancelled",
                        )
                        .map((d) =>
                            qtyMatrixSum(
                                ...d.items
                                    .filter(
                                        (i) =>
                                            i.orderProductionSubmissionId ==
                                            s.id,
                                    )
                                    .map(transformQtyHandle),
                            ),
                        )
                        .flat(),
                );
                return {
                    submissionId: s.id,
                    submitted,
                    delivered,
                    available: qtyMatrixDifference(submitted, delivered),
                };
            });
        })
        .flat();
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
        !production ? qty : submitted,
        qtyMatrixSum(dispatch.queued, dispatch.inProgress, dispatch.completed),
    );
    const pendingSubmissions = assignments
        .map((assignment) => {
            const pendingSubmission = qtyMatrixDifference(
                {
                    lh: assignment.lhQty,
                    rh: assignment.rhQty,
                    qty: assignment.qtyAssigned,
                },
                qtyMatrixSum(
                    ...assignment.submissions.map((s) => ({
                        lh: s.lhQty,
                        rh: s.rhQty,
                        qty: s.qty,
                    })),
                ),
            );
            return {
                qty: pendingSubmission,
                assignmentId: assignment.id,
            };
        })
        .filter((a) => a.qty.qty);

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
        deliverables,
        deliveredQty: qtyMatrixSum(
            stats.dispatchAssigned,
            stats.dispatchCompleted,
            stats.dispatchInProgress,
        )?.qty,
        submitQty: submitted.qty,
        pendingSubmissions,
        assignment: {
            pending: pendingAssignment,
            ids: assignments.map((a) => a.id),
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
