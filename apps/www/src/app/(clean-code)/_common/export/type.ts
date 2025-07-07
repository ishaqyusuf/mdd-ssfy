import { ExportConfig } from "@/db";

import { exportCells } from "./config";

export type ExportMeta = {
    selectedKeys: string[];
};
export type TypedExport = Omit<ExportConfig, "meta" | "type"> & {
    meta: ExportMeta;
    type: ExportTypes;
};
export interface ExportForm {
    title: string;
    type: ExportTypes;
    exports: {
        [key in string]: {
            selected: boolean;
        };
    };
    cellList: { title: string; selectNode: string; valueNode: string }[];
}
export type ExportCells = typeof exportCells;
export type ExportTypes = keyof ExportCells; //"order" | "quote";

export type CellTypes<T extends ExportTypes> = keyof ExportCells[T];

// CellTransform now uses keyof to ensure autocomplete works
export type CellTransform = Partial<{
    [type in keyof ExportCells]: Partial<{
        [title in keyof ExportCells[type]]: (value: any, data: any) => any; // Function type to transform the cells
    }>;
}>;
