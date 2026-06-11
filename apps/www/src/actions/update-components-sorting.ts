"use server";

import { prisma } from "@/db";
import { invalidateSalesWorkflowForStepComponent } from "@api/db/queries/sales-form";

interface Props {
    list: {
        componentId: number;
        sortUid: string;
        sortIndex: number;
    }[];
}
export async function updateComponentsSortingAction(data: Props) {
    await Promise.all(
        data.list.map(async (ls) => {
            // if(Array.isArray(ls.sortUid))
            await prisma.productSortIndex.upsert({
                create: {
                    sortIndex: ls.sortIndex,
                    uid: ls.sortUid,
                    stepComponentId: ls.componentId,
                },
                update: {
                    sortIndex: ls.sortIndex,
                },
                where: {
                    stepComponentId_uid: {
                        uid: ls.sortUid,
                        stepComponentId: ls.componentId,
                    },
                },
            });
        })
    );
    await Promise.all(
        data.list.map((ls) =>
            invalidateSalesWorkflowForStepComponent({
                componentId: ls.componentId,
            })
        )
    );
}
