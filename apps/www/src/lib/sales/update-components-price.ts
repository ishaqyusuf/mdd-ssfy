import {
    ComponentHelperClass,
    StepHelperClass,
} from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";

export async function updateComponentsPrice(
    component: ComponentHelperClass,
    takeOff = false,
) {
    const stepuids = component.getItemStepSequence();
    await Promise.all(
        stepuids
            .filter((a) => a !== component.itemStepUid)
            .map(async (itemStepUid) => {
                const stepClass = new StepHelperClass(itemStepUid);
                const stepForm = stepClass.getStepForm();
                if (!stepForm?.componentId) return;
                const components = await stepClass.fetchStepComponents();
                const selection = components?.find(
                    (s) =>
                        s._metaData.visible && stepForm?.componentId === s.id,
                );
                if (selection?.basePrice != stepForm?.basePrice) {
                    new ComponentHelperClass(
                        itemStepUid,
                        selection?.uid,
                        selection,
                    ).selectComponent(takeOff);
                }
            }),
    );
}
