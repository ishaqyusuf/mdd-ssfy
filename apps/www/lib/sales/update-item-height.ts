import { useHpt, useHptLine } from "@/components/forms/sales-form/context";
import { updateComponentsPrice } from "./update-components-price";
import { ComponentHelperClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";

interface Props {
    size?: {
        takeOffSize?;
        size?;
    };

    lineContext: ReturnType<typeof useHptLine>;
    hptContext: ReturnType<typeof useHpt>;
}
export function updateItemHeight({ hptContext, lineContext, size }: Props) {
    const { components, itemStepUid, step } = hptContext?.height || {};
    const component = components?.find((s) => size?.size?.endsWith(s?.title));
    if (step?.getStepForm().value != component?.title) {
        const componentClass = new ComponentHelperClass(
            itemStepUid,
            component?.uid,
            component,
        );
        componentClass.selectComponent(true);
        updateComponentsPrice(componentClass, true);
    }
}
