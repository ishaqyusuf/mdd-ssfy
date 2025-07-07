"use server";

import { getSettingAction } from "@/app/(v1)/_actions/settings";
import { prisma } from "@/db";
import { ICostChart } from "@/types/community";
import { InstallCostSettings } from "@/types/settings";

export async function _punchoutCosts() {
    const cost: InstallCostSettings = await getSettingAction(
        "install-price-chart"
    );

    return cost.meta.list.filter((l) => l.punchout);
}
