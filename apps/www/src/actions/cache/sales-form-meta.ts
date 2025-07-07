import { salesSettingsKey } from "@/actions/sales-settings";
import { SalesSettingsMeta } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { unstable_cache } from "next/cache";

export async function getSalesSettings() {
    return unstable_cache(
        async () => {
            const s = await prisma.settings.findFirst({
                where: {
                    type: salesSettingsKey,
                },
            });
            return {
                id: s.id,
                data: s.meta as SalesSettingsMeta,
            };
        },
        [salesSettingsKey],
        {
            tags: [salesSettingsKey],
        },
    );
}
