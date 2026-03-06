import { SalesFormZusData } from "@/app-deps/(clean-code)/(sales)/types";

import { StepHelperClass } from "./step-component-class";

export function zhHarvestDoorSizes(data: SalesFormZusData, itemUid) {
    const form = data.kvFormItem[itemUid];
    let heightStepUid;
    const stepVar = Object.entries(data.kvStepForm)
        .filter(([k, d]) => k?.startsWith(`${itemUid}-`))
        .map(([itemStepUid, frm]) => {
            if (frm.title == "Height") heightStepUid = itemStepUid;
            return {
                variation: frm?.meta?.doorSizeVariation,
                itemStepUid,
            };
        })
        .find((v) => v.variation);

    if (!stepVar?.variation) return null;
    const validSizes = stepVar.variation
        .map((c) => {
            const rules = c.rules;
            const valid = rules.every(
                ({ componentsUid, operator, stepUid }) => {
                    const selectedComponentUid =
                        data.kvStepForm[`${itemUid}-${stepUid}`]?.componentUid;
                    return (
                        !componentsUid?.length ||
                        (operator == "is"
                            ? componentsUid?.some(
                                  (a) => a == selectedComponentUid,
                              )
                            : componentsUid?.every(
                                  (a) => a != selectedComponentUid,
                              ))
                    );
                },
            );
            return {
                widthList: c.widthList,
                valid,
            };
        })
        .filter((c) => c.valid);

    const stepCls = new StepHelperClass(heightStepUid);
    const visibleComponents = stepCls.getVisibleComponents();
    const sizeList: {
        size: string;
        height: string;
        width: string;
        takeOffSize: string;
    }[] = [];
    visibleComponents?.map((c) => {
        validSizes.map((s) => {
            s.widthList.map((w) => {
                sizeList.push({
                    size: `${w} x ${c.title}`,
                    width: w,
                    height: c.title,
                    takeOffSize: [w, c.title].join("").split("-").join(""),
                });
            });
        });
    });
    return {
        sizeList,
        height: stepCls.getStepForm()?.value,
    };
}
