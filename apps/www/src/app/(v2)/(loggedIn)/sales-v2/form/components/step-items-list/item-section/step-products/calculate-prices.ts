import { DykeForm } from "@/app/(v2)/(loggedIn)/sales-v2/type";
import { UseFormReturn } from "react-hook-form";

export function calculateComponentPrices(
    form: UseFormReturn<DykeForm>,
    itemIndex
) {
    setTimeout(() => {
        //
        const item = form.getValues(`itemArray.${itemIndex}`);

        const total = item.item.formStepArray
            .map((s) => {
                // console.log(s.step.title, s.item.price);
                return s.item.price;
            })
            .filter((s) => s > 0)
            .reduce((a, b) => a + b, 0);
        form.setValue(
            `itemArray.${itemIndex}.item.housePackageTool.meta.priceTags.components`,
            total
        );
        if (item.multiComponent?.components) {
            Object.entries(item.multiComponent?.components)?.map(
                ([safeTitle, component]) => {
                    const basePath =
                        `itemArray.${itemIndex}.multiComponent.components.${safeTitle}` as any;
                    // console.log({ total, component, safeTitle });
                    form.setValue(
                        `${basePath}.priceTags.components` as any,
                        total
                    );
                }
            );
        }
    }, 500);
}
