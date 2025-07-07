"use server";

import { revalidatePath } from "next/cache";
import { AsyncFnType } from "@/app/(clean-code)/type";
import { _revalidate } from "@/app/(v1)/_actions/_revalidate";
import { userId } from "@/app/(v1)/_actions/utils";
import { OrderProductionSubmissions, Prisma } from "@/db";

import { LineItemOverview } from "../data-access/dto/sales-item-dto";
import {
    createItemAssignmentDta,
    deleteAssignmentDta,
    deleteAssignmentSubmissionDta,
    submitAssignmentDta,
    updateAssignmentDta,
} from "../data-access/sales-prod.dta";

export type ItemAssignmentForm = AsyncFnType<
    typeof getItemAssignmentFormUseCase
>;
export async function getItemAssignmentFormUseCase(item: LineItemOverview) {
    const pendingAssignments = item?.analytics?.pending?.assignment;
    return {
        assignedBy: {
            connect: {
                id: await userId(),
            },
        },
        assignedTo: {
            connect: {
                id: undefined,
            },
        },
        lhQty: pendingAssignments.lh,
        rhQty: pendingAssignments?.rh,
        qtyAssigned: null,
        dueDate: null,
        salesDoor: !item.doorItemId
            ? undefined
            : {
                  connect: {
                      id: item.doorItemId,
                  },
              },
        item: {
            connect: {
                id: item.salesItemId,
            },
        },
        order: {
            connect: {
                id: item.orderId,
            },
        },
        qtyCompleted: 0,
        note: "",
    } satisfies Prisma.OrderItemProductionAssignmentsCreateInput;
}
export async function createItemAssignmentUseCase(
    data: ItemAssignmentForm,
    produceable,
) {
    await createItemAssignmentDta(data, produceable);
    // await _revalidate('sales')
    revalidatePath("/sales-book/orders");
}
export type AssignmentSubmitForm =
    Prisma.OrderProductionSubmissionsCreateManyInput;
export async function submitAssignmentUseCase(
    data: AssignmentSubmitForm,
    produceable,
) {
    await submitAssignmentDta(data, produceable);
}
export async function deleteAssignmentUseCase(id, produceable) {
    await deleteAssignmentDta(id, produceable);
}
export async function deleteAssignmentSubmissionUseCase(id, produceable) {
    await deleteAssignmentSubmissionDta(id, produceable);
}

export async function updateAssignmentDueDateUseCase(id, dueDate) {
    const resp = await updateAssignmentDta(id, {
        dueDate,
    });
    return resp;
}
