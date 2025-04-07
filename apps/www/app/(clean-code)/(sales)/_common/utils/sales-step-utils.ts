import {
    DykeDoorType,
    DykeStepTitleKv,
    DykeStepTitles,
    StepMeta,
} from "../../types";
import { transformSalesStepMeta } from "../data-access/dto/sales-step-dto";
import { LoadSalesFormData } from "../data-access/sales-form-settings.dta";

export function composeStepRouting(fdata: LoadSalesFormData) {
    const sectionKeys = Object.keys(fdata.setting?.data?.route || [])?.map(
        (uid) => ({ uid }),
    );
    const stepsByKey: {
        [uid in string]: {
            id;
            title;
            uid;

            meta: StepMeta;
            components: {
                uid: string;
                id: number;
                title: string;
                redirectUid: string;
                img: string;
            }[];
        };
    } = {};
    // fdata.rootStep
    const rootComponentsByKey: {
        [uid in string]: { id?; title; uid; stepUid? };
    } = {};
    fdata.rootStep.stepProducts.map((s) => {
        rootComponentsByKey[s.uid] = {
            uid: s.uid,
            title: s.product?.title,
            stepUid: fdata.rootStep.uid,
        };
    });
    [...fdata.steps, fdata.rootStep].map((step) => {
        const { stepProducts, id, title, uid, ...rest } = step;
        stepsByKey[step.uid] = {
            meta: transformSalesStepMeta(rest)?.meta,
            id,
            title,
            uid,
            components: stepProducts?.map((p) => ({
                title: p.product?.title || p.door?.title,
                uid: p.uid,
                id: p.id,
                variations: p.meta?.variations || [],
                redirectUid: p.redirectUid,
                img: p.product?.img || p.door?.img,
            })),
        };
    });
    const composedRouter = { ...(fdata.setting?.data?.route || {}) };
    Object.keys(composedRouter).map((routeKey) => {
        composedRouter[routeKey].route = {};

        let crk = routeKey;
        composedRouter[routeKey].routeSequence?.map((s) => {
            composedRouter[routeKey].route[crk] = s.uid;
            crk = s.uid;
        });
    });
    return {
        ...fdata,
        composedRouter,
        sectionKeys,
        stepsByKey,
        rootComponentsByKey,
    };
}
const hiddenDisplaySteps = [
    "Door",
    "Item Type",
    "Moulding",
    "House Package Tool",
    "Height",
    "Hand",
    "Width",
];
export const composeStepFormDisplay = (stepForms, sectionTitle = null) => {
    const configs = stepForms
        ?.map((stepForm) => {
            let color = null;
            let label = stepForm?.step?.title?.toLowerCase();
            let value = stepForm?.value?.toLowerCase();
            let hidden =
                hiddenDisplaySteps
                    ?.map((a) => a.toLowerCase())
                    .includes(value) || !value;
            if (label == "item type" && !sectionTitle) sectionTitle = value;
            let red = [
                label == "hinge finish" && !value?.startsWith("us15"),
                label?.includes("jamb") && !value?.startsWith("4-5/8"),
            ];
            if (red.some(Boolean)) color = "red";
            return {
                color,
                label,
                value,
                hidden,
            };
        })
        .filter((a) => !a.hidden);
    return {
        configs,
        sectionTitle,
    };
};
