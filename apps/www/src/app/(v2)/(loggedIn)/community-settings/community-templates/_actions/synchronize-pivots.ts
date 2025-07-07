"use server";

import { prisma } from "@/db";
import { getPivotModel } from "@/lib/community/community-utils";
import { ICommunityPivotMeta } from "@/types/community";

export async function _synchronizePivot() {
    const pivots = await prisma.communityModelPivot.findMany({
        select: {
            id: true,
            projectId: true,
            model: true,
            meta: true,
        },
        orderBy: {
            updatedAt: "desc",
        },
    });
    let _pivots: any = {};
    const communities = await prisma.communityModels.findMany({
        select: { id: true, modelName: true, pivotId: true, projectId: true },
    });
    // const updates: any = {};
    await Promise.all(
        communities.map(async (c) => {
            let cp = pivots.filter(
                (p) =>
                    p.projectId == c.projectId &&
                    p.model == getPivotModel(c.modelName)
            );
            if (cp.length > 0) {
                let _rcp: any = null;
                cp.map((c, i) => {
                    if (
                        !_rcp &&
                        (c.meta as any as ICommunityPivotMeta)?.installCost
                    )
                        _rcp = c.meta;
                });
                if (!_rcp) _rcp = cp[0];
                if (c.id == 335) console.log(_rcp, cp);
                if (_rcp.id != c.id) {
                    await prisma.communityModels.update({
                        where: { id: c.id },
                        data: {
                            pivotId: _rcp.id,
                        },
                    });
                }
            }
        })
    );
    const d = await prisma.communityModelPivot.deleteMany({
        where: {
            communityModels: {
                every: {
                    id: {
                        lt: 0,
                    },
                },
            },
        },
    });
    console.log(d);
    // await Promise.all(pivots.map(async (pivot) => {
    //     let slug = `${pivot.model}-${pivot.projectId}`;
    //     let pid = _pivots[slug];
    //     if(pid) {
    //         await prisma.communityModels.updateMany({
    //             where: {
    //                 id
    //             },
    //             data: {
    //                 pivotId:pid
    //             }
    //         })
    //     }
    // }));
}
