import { LoadStepComponentsProps } from "@/app/(clean-code)/(sales)/_common/data-access/step-components.dta";
import { DykeDoorType } from "../../../../types";
import { IDykeComponentStore } from "../../_hooks/data-store";
import { LegacyDykeFormItemType } from "../../_hooks/legacy-hooks";
import { LegacyDykeFormStepType } from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy/use-dyke-form-step";
import { getStepComponents } from "../../_actions/steps.action";
import { initStepComponents } from "@/app/(v2)/(loggedIn)/sales-v2/form/components/step-items-list/item-section/step-products/init-step-components";
import { IStepProducts } from "@/app/(v2)/(loggedIn)/sales-v2/form/components/step-items-list/item-section/step-products";

const helpers = {
    item: {
        getDoorType,
    },
    step: {
        loadComponents,
        getStepTitle,
    },
};
function getStepTitle(stepCtx: LegacyDykeFormStepType) {
    const formStep = stepCtx.step.step.title;
    return formStep;
}
function getDoorType(itemCtx: LegacyDykeFormItemType): DykeDoorType {
    const steps = itemCtx.mainCtx.form.getValues(
        `itemArray.${itemCtx.rowIndex}.item.formStepArray`
    );
    console.log({ steps });
    return steps?.find((s) => s.step.title == "Item Type")?.item?.value as any;
}
async function loadComponents(
    storeComponentsByTitle: IDykeComponentStore["loadedComponentsByStepTitle"],
    stepCtx: LegacyDykeFormStepType,
    ignoreCache = false
) {
    const title = `${helpers.step.getStepTitle(
        stepCtx
    )}-${stepCtx.itemCtx.get.uid()}`;
    // console.log({ title });
    const storedComponents = storeComponentsByTitle[title];
    const props: LoadStepComponentsProps = {};
    const resp = {
        data: storedComponents || [],
        cache: storedComponents?.length > 0,
        key: title,
    };
    // TODO: POOOOR CODE. FIX
    if (!resp.cache || ignoreCache) {
        if (title == "Door") props.stepTitle = "Door";
        else if (title == "Moulding") props.stepTitle = "Moulding";
        else props.stepId = stepCtx.step.step.id;
        const _resp = await getStepComponents(props);
        resp.data = _resp;
        stepCtx.updateComponent(title, _resp);
    } else {
    }
    const allComponents: IStepProducts = await initComponents(
        stepCtx,
        resp.data
    );
    stepCtx.setComponents(allComponents);
    stepCtx.setFilteredComponents(
        allComponents.filter((s) => !s._metaData.hidden && !s.custom)
    );
    stepCtx.setDeletedComponents(
        allComponents.filter((s) => s._metaData.hidden)
    );

    // console.log({ props, cache: resp.cache, len: resp.data?.length });
    return resp;
}
async function initComponents(stepCtx: LegacyDykeFormStepType, data) {
    return await initStepComponents(stepCtx.mainCtx.form, {
        stepProducts: data,
        stepForm: stepCtx.step,
        stepArray: stepCtx.itemCtx.formSteps(),
        //item.get.getFormStepArray(),
        stepIndex: stepCtx.stepIndex,
    });
    // await ÷
    // TODO: you know what to do
    return data;
}

const legacyDykeFormHelper = helpers;
export default legacyDykeFormHelper;
