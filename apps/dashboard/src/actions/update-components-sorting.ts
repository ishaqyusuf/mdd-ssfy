"use server";

import { prisma } from "@/db";
import { invalidateSalesWorkflowForStepComponent } from "@api/db/queries/sales-form";
import { advanceSalesWorkflowCatalogRevision } from "@gnd/db/queries";

interface Props {
    list: {
        componentId: number;
        sortUid: string;
        sortIndex: number;
    }[];
}
export async function updateComponentsSortingAction(data: Props) {
    if (!data.list.length) return;
    await prisma.$transaction(async (tx) => {
    await Promise.all(
        data.list.map(async (ls) => {
            // if(Array.isArray(ls.sortUid))
            await tx.productSortIndex.upsert({
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
    await advanceSalesWorkflowCatalogRevision(tx);
    });
    await Promise.all(
        data.list.map((ls) =>
            invalidateSalesWorkflowForStepComponent({
                componentId: ls.componentId,
            })
        )
    );
}
