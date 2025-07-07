import { prisma } from "@/db";
import { SettingType } from "@/types/settings";
import { SalesSettingsMeta } from "../app/(clean-code)/(sales)/types";
import { getStepsForRoutingDta } from "../app/(clean-code)/(sales)/_common/data-access/sales-form-step-dta";
import { AsyncFnType } from "@/app/(clean-code)/type";
import { revalidateTag, unstable_cache } from "next/cache";

export const salesSettingsKey: SettingType = "sales-settings";
export async function loadSalesSetting() {
    const fn = async () => {
        const s = await prisma.settings.findFirst({
            where: {
                type: salesSettingsKey,
            },
        });
        return {
            id: s.id,
            data: s.meta as SalesSettingsMeta,
        };
    };
    const tags = [salesSettingsKey];
    return unstable_cache(fn, tags, {
        tags,
    })();
}
export type LoadSalesFormData = AsyncFnType<typeof loadSalesFormData>;
export async function loadSalesFormData() {
    const setting = await loadSalesSetting();
    const steps = await getStepsForRoutingDta();
    const rootStep = steps.find((s) => s.id == 1);

    return {
        setting,
        steps: steps.filter((s) => s.id != 1),
        rootStep,
    };
}
export async function saveSalesSettingData(meta) {
    await prisma.settings.updateMany({
        where: {
            type: salesSettingsKey,
        },
        data: {
            meta,
        },
    });
    revalidateTag(salesSettingsKey);
}
