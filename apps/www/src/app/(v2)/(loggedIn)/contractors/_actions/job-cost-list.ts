"use server";

import { prisma } from "@/db";
import { IJobType } from "@/types/hrm";
import { InstallCostSettings } from "@/types/settings";

export async function getJobCostList(type: IJobType) {
    const s: InstallCostSettings = (await prisma.settings.findFirst({
        where: {
            type: "install-price-chart",
        },
    })) as any;
    let list = s.meta.list
        .map((f) => {
            if (f.punchout) {
                if (type == "punchout") return f;
            } else {
                if (type == "installation") return f;
            }
            return null;
        })
        .filter(Boolean);

    return list;
}
