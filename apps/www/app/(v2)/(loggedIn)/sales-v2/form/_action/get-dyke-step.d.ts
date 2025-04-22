import { ComponentPrice, DykeStepForm } from "@/db";
import { DykeFormStepMeta } from "../../type";
export declare function getStepForm(id: any): Promise<{
    step: any;
    item: Omit<DykeStepForm, "meta"> & {
        meta: DykeFormStepMeta;
        priceData?: Partial<ComponentPrice>;
    };
}>;
