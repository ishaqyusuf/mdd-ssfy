import {
    DykeStep,
    DykeStepMeta,
    FormStepArray,
} from "@/app/(v2)/(loggedIn)/sales-v2/type";
import { IStepProducts } from ".";
// import { getStepPricings } from "./_actions";
import salesFormUtils from "@/app/(clean-code)/(sales)/_common/utils/sales-form-utils";

interface Props {
    stepProducts: IStepProducts;
    stepForm: DykeStep;
    stepArray: FormStepArray;
    stepIndex;
}
export async function initStepComponents(
    form,
    { stepProducts, stepForm, stepArray, stepIndex }: Props,
) {
    return null as any;
}
export function getFormSteps(formStepArray: FormStepArray, stepIndex) {
    const dependecies = formStepArray
        .map((s) => ({
            uid: s.step.uid,
            label: s.step.title,
            value: s.item.value,
            prodUid: s.item.prodUid,
        }))
        .filter((_, i) => i < stepIndex);
    return dependecies;
}
export function getDykeStepState(
    _formSteps: ReturnType<typeof getFormSteps>,
    stepForm: DykeStep,
) {
    const stateDeps = stepForm.step.meta.stateDeps;
    let states: {
        step: (typeof _formSteps)[number];
        steps: typeof _formSteps;
        key: string;
    }[] = [];
    let stateBuilder = null;
    _formSteps.map((step, i) => {
        if (stateDeps?.[step.uid]) {
            stateBuilder = [stateBuilder, step.prodUid]
                .filter(Boolean)
                .join("-");
            states.push({
                step,
                steps: stateBuilder
                    ?.split("-")
                    .map((k) => _formSteps.find((fs) => fs.prodUid == k)),
                key: stateBuilder,
            });
            if (i > 0) {
                let sb2 = step.prodUid;
                states.push({
                    step,
                    steps: sb2
                        ?.split("-")
                        .map((k) => _formSteps.find((fs) => fs.prodUid == k)),
                    key: sb2,
                });
            }
        }
    });
    return states;
}

export function getDepsUid(stepIndex, formStepArray, stepForm) {
    const dependecies = getFormSteps(formStepArray, stepIndex).filter(
        (_, i) => stepForm.step.meta?.priceDepencies?.[_.uid],
    );
    const uids = dependecies.map((s) => s.prodUid);
    return uids.length ? uids.join("-") : null;
}
