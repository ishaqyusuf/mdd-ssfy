import { DykeDoorType } from "../type";

export interface HousePackageToolSettingsMeta {
    sizes: {
        ft: string;
        in: string;
        type?: DykeDoorType;
        width: boolean;
        height: boolean;
    }[];
}
export interface HousePackageToolSettings {
    id: number;
    type: string;
    data: HousePackageToolSettingsMeta;
}
