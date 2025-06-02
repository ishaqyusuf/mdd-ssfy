import {
    useFormDataStore,
    ZusGroupItemFormPath,
} from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { HptClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/hpt-class";
import {
    ComponentHelperClass,
    StepHelperClass,
} from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { composeDoor } from "@/lib/sales/compose-door";
import { createContextFactory } from "@/utils/context-factory";
import { useEffect, useMemo, useState } from "react";
import { FieldPath, FieldPathValue } from "react-hook-form";
import { useAsyncMemo } from "use-async-memo";

export type HptContext = ReturnType<typeof useHpt>;
export const { Provider: HptContextProvider, useContext: useHpt } =
    createContextFactory((itemStepUid) => {
        const zus = useFormDataStore();
        const [itemUid] = itemStepUid.split("-");
        const itemForm = zus.kvFormItem?.[itemUid];
        const height = useAsyncMemo(async () => {
            const heightItemStepUid = Object.entries(zus?.kvStepForm)?.find(
                ([k, v]) =>
                    v?.title == "Height" &&
                    k?.startsWith(itemStepUid?.split("-")?.[0]),
            )?.[0];
            const step = new StepHelperClass(heightItemStepUid);
            const components = (await step?.fetchStepComponents())?.filter(
                (a) => a._metaData?.visible,
            );
            return {
                components,
                step,
                itemStepUid: heightItemStepUid,
            };
        }, []);
        const ctx = useMemo(() => {
            const ctx = new HptClass(itemStepUid);
            // const itemForm = ctx.getItemForm();
            const itemType = itemForm?.groupItem?.itemType;
            const isSlab = itemType === "Door Slabs Only";

            return {
                zus,
                hpt: ctx,
                itemForm,
                ...ctx.getHptForm(),
                // componentClass,
                // door,
                itemType,
                isSlab,
            };
        }, [
            itemStepUid,
            itemForm?.swapUid,
            itemForm.groupItem?.doorStepProductUid,
        ]);
        const componentClass = new ComponentHelperClass(
            itemStepUid,
            itemForm?.groupItem?.doorStepProductUid,
        );
        const door = composeDoor(componentClass);
        useEffect(() => {
            let tuid = ctx.hpt.tabUid;
            if (ctx.doors.every((s) => s.uid != ctx.hpt.tabUid)) {
                // console.log(ctx.doors?.[0]?.uid);
                tuid = ctx.doors?.[0]?.uid;
                ctx.hpt.dotUpdateItemForm(
                    "groupItem._.tabUid",
                    ctx.doors?.[0]?.uid,
                );
            }
        }, [ctx.doors]);
        const itemType = ctx?.hpt?.getItemForm()?.groupItem?.itemType;
        const isSlab = itemType === "Door Slabs Only";

        const [showNote, setShowNote] = useState(false);
        return {
            ...ctx,
            itemUid: ctx.hpt.itemUid,
            isSlab,
            itemType,
            showNote,
            setShowNote,
            componentClass,
            door,
            height,
        };
    });

interface Props {
    lineUid;
    // size?: {
    //     path?: string;
    //     // takeOffSize?: string;
    //     title?: string;
    // };
    sn?;
}
export const { Provider: HptLineContextProvider, useContext: useHptLine } =
    createContextFactory((props: Props) => {
        const ctx = useHpt();
        const lineUid = props?.lineUid;
        const valueChanged = () => {
            ctx.hpt.updateGroupedCost();
            ctx.hpt.calculateTotalPrice();
        };
        const { sizeForm, size, unitLabor } = useMemo(() => {
            const unitLabor = ctx.hpt.dotGetGroupItemFormValue(
                lineUid,
                "pricing.unitLabor",
            );
            const size = ctx?.door?.sizePrice?.find((s) => s.path == lineUid);
            const sizeForm = ctx.itemForm?.groupItem.form[size?.path];
            return {
                sizeForm,
                size,
                unitLabor,
            };
        }, [lineUid]);
        const setValue = <K extends FieldPath<ZusGroupItemFormPath>>(
            pathName: K,
            value: FieldPathValue<ZusGroupItemFormPath, K>,
        ) => {
            console.log(ctx.itemUid);
            ctx.zus.dotUpdate(
                `kvFormItem.${ctx.itemUid}.groupItem.form.${lineUid}.${pathName}`,
                value as any,
            );
        };
        return {
            ...props,
            setValue,
            unitLabor,
            size,
            sizeForm,
            lineUid,
            valueChanged,
        };
    });
