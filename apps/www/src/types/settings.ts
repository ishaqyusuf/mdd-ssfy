import { Settings } from "@/db";

import { OmitMeta } from "./type";

export type InstallCostSettings = OmitMeta<Settings> & {
    meta: InstallCostMeta;
};
export type AppDownloadSettings = OmitMeta<Settings> & {
    meta: AppDownloadMeta;
};
export interface InstallCostMeta {
    list: InstallCostLine[];
}
export interface AppDownloadMeta {
    fileName?: string | null;
    version?: string | null;
    downloadUrl?: string | null;
    publicId?: string | null;
    assetId?: string | null;
    uploadedAt?: string | null;
    uploadedBy?: {
        id?: number | null;
        name?: string | null;
        email?: string | null;
    } | null;
    notes?: string | null;
}
export interface InstallCostLine {
    defaultQty;
    id;
    title;
    cost;
    contractor?: boolean;
    punchout?: boolean;
    uid?;
}
export type SettingType =
    | "sales-settings"
    | "install-price-chart"
    | "app-download-apk";
