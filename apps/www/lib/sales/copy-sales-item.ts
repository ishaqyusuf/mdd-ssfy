import { useTakeoffItem } from "@/components/forms/sales-form/take-off/context";

export function copySalesTakeOffItem(
    fromUid,
    toUid,
    item: ReturnType<typeof useTakeoffItem>,
) {
    //sequence
    const {
        updateFormItem,
        dotUpdate,
        kvFormItem,
        sequence,
        kvStepForm,
        ...zus
    } = item.zus;
    const [itemStepUid, stepSequence] = Object.entries(
        sequence.stepComponent,
    )?.find(([itemStepUid, stepSequence]) => itemStepUid?.startsWith(fromUid));
    dotUpdate(
        `sequence.stepComponent.${itemStepUid?.replace(fromUid, toUid)}`,
        stepSequence?.map((s) => s.replace(fromUid, toUid)),
    );
    Object.entries(kvStepForm).map(([uid, data]) => {
        if (uid?.startsWith(fromUid)) {
            const { stepFormId, salesOrderItemId, ...toData } = { ...data };
            dotUpdate(`kvStepForm.${uid?.replace(fromUid, toUid)}`, toData);
        }
    });
    const {
        id,
        groupItem: { hptId, ...groupItem },
        title,
        ...toForm
    } = kvFormItem[fromUid];
    groupItem.form = Object.fromEntries(
        Object.entries(groupItem.form).map(([k, v]) => {
            v.doorId = null;
            v.hptId = null;
            return [k, v];
        }),
    );
    dotUpdate(`kvFormItem.${toUid}`, {
        ...toForm,
        groupItem: {
            ...groupItem,
        },
    });
}
