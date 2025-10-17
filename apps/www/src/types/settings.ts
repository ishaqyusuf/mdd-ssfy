import { Settings } from "@/db";

import { OmitMeta } from "./type";

export type InstallCostSettings = OmitMeta<Settings> & {
    meta: InstallCostMeta;
};
export interface InstallCostMeta {
    list: InstallCostLine[];
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
export type SettingType = "sales-settings" | "install-price-chart";
