"use server";
import { prisma } from "@/db";
import { ISalesSetting } from "@/types/post";
import { InstallCostSettings, SettingType } from "@/types/settings";

export async function getSettingAction<T>(type: SettingType) {
    // const type: PostType = "sales-settings";
    const setting = await prisma.settings.findFirst({
        where: {
            type,
        },
    });
    if (!setting) {
        let newSetting = await prisma.settings.create({
            data: {
                type,
                meta: {},
            },
        });
        return newSetting as T;
    }
    return setting as T;
}
export async function getInstallCostSettingAction() {
    return await getSettingAction<InstallCostSettings>("install-price-chart");
}
export async function getSalesSettingAction() {
    return await getSettingAction<ISalesSetting>("sales-settings");
}
export async function saveSettingAction(id, data): Promise<any> {
    // const type: PostType = "sales-settings";
    const setting = await prisma.settings.update({
        where: {
            id,
        },
        data,
    });
    return setting;
}

export async function updateSettingsMeta(meta, id?) {
    const settings = await getSettingAction<any>("sales-settings");
    if (!settings?.id) throw Error("Setting not found");
    else id = settings.id;
    await prisma.settings.update({
        where: { id },
        data: {
            meta,
        },
    });
}
