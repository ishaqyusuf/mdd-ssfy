import { useDykeForm } from "./form-context";
import { UseFieldArrayReturn, useFieldArray } from "react-hook-form";
import {
    DykeDoorType,
    DykeForm,
    DykeFormItem,
    FormStepArray,
} from "../../type";
import { useModal } from "@/components/common/modal/provider";

import { useMultiSelector } from "./use-multi-selector";
import { isComponentType } from "../../overview/is-component-type";

// export interface IDykeItemFormContext {
//     blocks: DykeBlock[];
//     openedStepIndex: number;
//     nextBlock(value);
//     selectBlockValue(label, value);
//     openBlock(blockIndex);
//     configValueKey(title);
//     blocksKey: string;
//     rowIndex: string;
//     itemKey: string;
// }

export type IDykeItemFormContext = ReturnType<typeof useDykeItem>;
export default function useDykeItem(
    rowIndex: number,
    itemArray: UseFieldArrayReturn<DykeForm, "itemArray", "id">
) {
    const form = useDykeForm();
    const stepArrayName = `itemArray.${rowIndex}.item.formStepArray` as const;
    const itemKey = `itemArray.${rowIndex}.item` as any;
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: stepArrayName,
    });
    const [opened, openedStepIndex, expanded, calculatedPriceMode] = form.watch(
        [
            `itemArray.${rowIndex}.opened`,
            `itemArray.${rowIndex}.stepIndex`,
            `itemArray.${rowIndex}.expanded`,
            `order.meta.calculatedPriceMode`,
        ]
    );
    function getFormStepArray(): FormStepArray {
        return form.getValues(
            `itemArray.${rowIndex}.item.formStepArray` as any
        );
    }
    function doorType(): DykeDoorType {
        return form.getValues(`${itemKey}.meta.doorType` as any);
    }
    const get = {
        uid: () => form.getValues(`itemArray.${rowIndex}.uid`),
        itemArray: (): DykeForm["itemArray"][0] =>
            form.getValues(`itemArray.${rowIndex}` as any),
        data: (): DykeFormItem =>
            form.getValues(`itemArray.${rowIndex}` as any),
        getFormStepArray,
        doorType,
        getMouldingSpecie() {
            const formSteps = getFormStepArray();
            const s = formSteps.find((fs) => fs.step?.title == "Specie");
            return s?.item?.value;
        },
        packageToolId: (k: "dykeDoor" | "molding") =>
            form.getValues(
                `itemArray.${rowIndex}.item.housePackageTool.${k}}Id` as any
            ),
    };
    const modal = useModal();
    const multi = useMultiSelector(rowIndex, get);
    const _type = {
        isService: () => get.doorType() == "Services",
        isSlab: () => get.doorType() == "Door Slabs Only",
        isBifold: () => get.doorType() == "Bifold",
    };
    return {
        expanded,
        toggleExpand() {
            form.setValue(`itemArray.${rowIndex}.expanded`, !expanded);
        },
        calculatedPriceMode,
        multi,
        isType: isComponentType(get.doorType()),
        move(to) {
            itemArray.move(rowIndex, to);
        },
        get,
        _type,
        opened,
        openedStepIndex,
        toggleStep(stepIndex) {
            form.setValue(
                `itemArray.${rowIndex}.stepIndex`,
                stepIndex == openedStepIndex ? null : stepIndex
            );
        },
        openChange(val) {
            form.setValue(`itemArray.${rowIndex}.opened`, val);
        },
        formStepArray: fields,
        appendStep: append,
        removeStep: remove,
        rowIndex,
        itemKey,

        // doorType(): DykeDoorType {
        //     return form.getValues(
        //         `${itemKey}.housePackageTool.doorType` as any
        //     );
        // },
        configValueKey(blockName) {
            return `items.${rowIndex}.meta.config.${blockName}` as any;
        },
        async nextBlock(value) {
            // console.log(value);
            // let block: any = null;
            // let blockIndex = openedStepIndex + 1;
            // if (value == "Shelf Items") {
            //     block = createBlock("Shelf Items", []);
            // } else {
            //     // next block
            // }
            // console.log(block);
            // if (!block) return;
            // form.setValue(blockIndexKey, blockIndex);
            // append(block);
        },
        async selectBlockValue(label, product) {
            // form.setValue(this.configValueKey(label), value);
            // await this.nextBlock(value);
        },
    };
}
