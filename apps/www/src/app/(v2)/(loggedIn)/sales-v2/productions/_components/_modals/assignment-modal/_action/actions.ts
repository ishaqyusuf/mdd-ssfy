"use server";

import { updateSalesProgressDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-progress.dta";
import { _revalidate } from "@/app/(v1)/_actions/_revalidate";
import { OrderProductionSubmissions, prisma } from "@/db";
import { sum } from "@/lib/utils";

import { GetOrderAssignmentData } from "./get-order-assignment-data";

type Props =
    GetOrderAssignmentData["doorGroups"][0]["salesDoors"][0]["assignments"][0];

export async function serverDate(date) {
    // dayjs.locale(ILOca)
    return date;
}
export async function __revalidateProductions() {
    await _revalidate("orders");
    await _revalidate("sales-production-2");
}
export async function _deleteAssignment(data: Props) {
    const isLeft = data.__report.handle == "LH";
    const k = isLeft ? "lhQty" : "rhQty";

    const { lhQty = 0, rhQty = 0 } = data;

    const _delete = isLeft ? (rhQty || 0) == 0 : (lhQty || 0) == 0;
    const updateData: any = {};
    if (_delete) updateData.deletedAt = new Date();
    else {
        updateData[k] = 0;
    }

    const assignment = await prisma.orderItemProductionAssignments.update({
        where: { id: data.id },
        data: {
            ...updateData,
        },
    });
    await updateSalesProgressDta(assignment.orderId, "prodAssigned", {
        minusScore: assignment?.qtyAssigned,
    });
    await _deleteAssignmentSubmissions(data.id, k);
}
export async function _changeAssignmentDueDate(assignmentId, date) {
    await prisma.orderItemProductionAssignments.update({
        where: {
            id: assignmentId,
        },
        data: {
            dueDate: date,
        },
    });
}
export async function _deleteAssignmentSubmission(submissionId) {
    const submission = await prisma.orderProductionSubmissions.update({
        where: {
            id: submissionId,
            deletedAt: null,
        },
        data: {
            deletedAt: new Date(),
        },
    });
    const qty = submission?.qty;
    await updateSalesProgressDta(submission?.salesOrderId, "prodCompleted", {
        minusScore: qty,
    });
}
export async function _deleteAssignmentSubmissions(
    assignmentId,
    k: "rhQty" | "lhQty",
) {
    const submissions = await prisma.orderProductionSubmissions.findMany({
        where: {
            assignmentId,
            deletedAt: null,
            [k]: {
                gt: 0,
            },
        },
    });
    await prisma.orderProductionSubmissions.updateMany({
        where: {
            assignmentId,
            [k]: {
                gt: 0,
            },
        },
        data: {
            deletedAt: new Date(),
        },
    });
    const salesOrderId = submissions[0]?.salesOrderId;
    const totalQty = await sum(submissions, "qty");
    await updateSalesProgressDta(salesOrderId, "prodAssigned", {
        minusScore: totalQty,
    });
}
export async function _submitProduction(
    data: Partial<OrderProductionSubmissions>,
) {
    const qty = sum([data.lhQty, data.rhQty]);
    data.qty = qty;
    const s = await prisma.orderProductionSubmissions.create({
        data: {
            ...(data as any),
        },
    });
    await prisma.orderItemProductionAssignments.update({
        where: { id: data.assignmentId as any },
        data: {
            qtyCompleted: {
                increment: qty,
            },
        },
    });
    await updateSalesProgressDta(data.salesOrderId, "prodCompleted", {
        plusScore: qty,
    });
}
