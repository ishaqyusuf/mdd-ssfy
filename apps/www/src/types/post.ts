import { Settings } from "@/db";

export const PostTypes = {
    SALES_SETTINGS: "sales-settings",
    SWINGS: "swings",
    SUPPLIERS: "suppliers",
};
export type PostType = "sales-settings" | "swings" | "suppliers";
export type ISalesSetting = Settings & {
    meta: ISalesSettingMeta;
};
// export type IOrderDeleteSalesAction =  orderDeleteCommissionAction['']
export interface ISalesSettingMeta {
    ccc;
    production_event;
    sales_margin;
    salesProfileId;
    tax_percentage;
    defaultFrame;
    defaultHinge;
    defaultCasing;
    commission: {
        percentage: number;
        // orderDeleteAction: IOrderDeleteSalesAction;
    };
    manualEstimate: Boolean;
    wizard: ISalesWizard;
    dyke: {
        customInputSection: {
            changed: string;
            sections: { name: string }[];
            _sectionSelect;
        };
    };
}
export interface ISalesWizard {
    titleMarkdown; //@Door | @Qty | @xyz | @
    form: ISalesWizardForm[];
}
export type WizardInputType = "Option" | "Text" | "Checkbox";
export interface ISalesWizardForm {
    uuid;
    label;
    category;
    hasQty?: Boolean;
    inputType: WizardInputType;
    hasCost?;
    checkedValue?;
    depId?;
    uncheckedValue?;
    options?: string[];
    defaultQty?;
    defaultPrintValue?;
    deleted?: Boolean;
}
