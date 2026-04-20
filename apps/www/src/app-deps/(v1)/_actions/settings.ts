"use server";

import { prisma } from "@/db";
import { ISalesSetting } from "@/types/post";
import {
    AppDownloadMeta,
    AppDownloadSettings,
    InstallCostSettings,
    SettingType,
} from "@/types/settings";
import { serverSession } from "./utils";

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
export async function getAppDownloadSettingAction() {
    return await getSettingAction<AppDownloadSettings>("app-download-apk");
}
export async function saveSettingAction(id, data): Promise<any> {
    // const type: PostType = "sales-settings";
    // console.log("Saving setting", id, data);
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

export async function saveAppDownloadSettingAction(meta: AppDownloadMeta) {
    const session = await serverSession();
    const role = session?.role?.name?.toLowerCase();

    if (role !== "super admin") {
        throw new Error("Only super admins can update the mobile app download.");
    }

    const settings = await getAppDownloadSettingAction();
    if (!settings?.id) throw new Error("App download setting not found");

    return await prisma.settings.update({
        where: {
            id: settings.id,
        },
        data: {
            meta: {
                ...meta,
                uploadedAt: meta?.uploadedAt || new Date().toISOString(),
                reminderSentAt: meta?.reminderSentAt || null,
                reminderSentForExpiry: meta?.reminderSentForExpiry || null,
                uploadedBy: {
                    id: session?.user?.id ?? null,
                    name: session?.user?.name ?? null,
                    email: session?.user?.email ?? null,
                },
            },
        },
    });
}
