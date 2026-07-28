import { sum } from "@/lib/utils";
import {
    Assignments,
    LineAssignment,
    LineItemOverview,
    qtyDiff,
} from "./sales-item-dto";

export function salesItemAssignmentsDto(
    data: LineItemOverview,
    _assignments: Assignments
) {
    const assignments: LineAssignment[] = [];

    _assignments.map((d, i) => {
        function __sum(k: "lhQty" | "rhQty" | "qty", data) {
            return sum(data.map((s) => s?.[k]));
        }
        const deliveries = d.submissions.map((s) => s.itemDeliveries).flat();
        const qty = __qty(
            d.lhQty,
            d.rhQty,
            data.hasSwing ? null : d.qtyAssigned
        );
        const submitted = __qty(
            __sum("lhQty", d.submissions),
            __sum("rhQty", d.submissions),
            data.hasSwing ? null : __sum("qty", d.submissions)
        );
        const _data: LineAssignment = {
            assignedTo: d.assignedTo?.name || "Not Set",
            id: d.id,
            assignedToId: d.assignedToId,
            dueDate: d.dueDate,
            submissions: d.submissions.map((sb) => ({
                id: sb.id,
                date: sb.createdAt,
                qty: __qty(sb.lhQty, sb.rhQty, data.hasSwing ? null : sb.qty),
            })),
            deliveries: deliveries.map((del) => ({
                date: del.createdAt,
                deliveryId: del.orderDeliveryId,
                submissionId: del.orderProductionSubmissionId,
                status: "queue",
                id: del.id,
                qty: __qty(
                    del.lhQty,
                    del.rhQty,
                    data.hasSwing ? null : del.qty
                ),
            })),

            submitted,
            delivered: __qty(
                __sum("lhQty", deliveries),
                __sum("rhQty", deliveries),
                data.hasSwing ? null : __sum("qty", deliveries)
            ),
            qty,
            pending: qtyDiff(qty, submitted),
            _: {
                qtyAssigned: d.qtyAssigned,
                qtySubmitted: d.qtyCompleted,
            },
        };
        // _data.pendingQty = _data.qty.total - _data.submitted.total;
        assignments.push(_data);
    });
    return assignments;
}
function __qty(lh, rh, qty) {
    let total = qty;
    if (lh || rh) total = sum([lh, rh]);
    return {
        lh,
        rh,
        qty,
        total,
    };
}
