import {
    useFormDataStore,
    ZusComponent,
    ZusGroupItemFormPath,
} from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { HptClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/hpt-class";
import {
    ComponentHelperClass,
    StepHelperClass,
} from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { DykeDoorType } from "@/app/(clean-code)/(sales)/types";
import { composeDoor } from "@/lib/sales/compose-door";
import { generateRandomString, sum } from "@/lib/utils";
import createContextFactory from "@/utils/context-factory";
import { useEffect, useMemo, useState } from "react";
import { FieldPath, FieldPathValue } from "react-hook-form";
import { useAsyncMemo } from "use-async-memo";
import { useTakeoffItem } from "./take-off/context";
import { GroupFormClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/group-form-class";
import { ServiceClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/service-class";

export type HptContext = ReturnType<typeof useHpt>;
export const { Provider: HptContextProvider, useContext: useHpt } =
    createContextFactory(
        ({
            itemStepUid,
            doorUid,
        }: {
            itemStepUid: string;
            doorUid?: string;
        }) => {
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
            }, [itemStepUid, itemForm?.swapUid, itemForm.groupItem]);
            const componentClass = new ComponentHelperClass(
                itemStepUid,
                // itemForm?.groupItem?.doorStepProductUid,
                ctx.hpt.tabUid,
            );
            const door = composeDoor(componentClass);
            useEffect(() => {
                let tuid = ctx.hpt.tabUid;
                if (ctx.doors.every((s) => s.uid != ctx.hpt.tabUid)) {
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
        },
    );

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
        const { sizeForm, unitLabor, size } = useMemo(() => {
            const size = ctx?.door?.sizePrice?.find((s) => s.path == lineUid);
            const unitLabor = ctx.hpt.dotGetGroupItemFormValue(
                lineUid,
                "pricing.unitLabor",
            );
            const sizeForm = ctx.itemForm?.groupItem.form[size?.path];

            return {
                sizeForm,
                // size,
                unitLabor,
                size,
            };
        }, [lineUid, ctx?.door?.sizePrice]);
        console.log({ size, sizeForm, sp: ctx?.door?.sizePrice });
        const setValue = <K extends FieldPath<ZusGroupItemFormPath>>(
            pathName: K,
            value: FieldPathValue<ZusGroupItemFormPath, K>,
        ) => {
            ctx.zus.dotUpdate(
                `kvFormItem.${ctx.itemUid}.groupItem.form.${lineUid}.${pathName}`,
                value as any,
            );
        };
        const zDoor = !size?.path
            ? sizeForm
            : ctx.itemForm.groupItem?.form?.[size.path];

        return {
            ...props,
            setValue,
            unitLabor,
            size,
            sizeForm,
            lineUid,
            valueChanged,
            zDoor,
        };
    });
interface GroupedItemContextProps {
    itemType?: DykeDoorType;
    stepSequence?: string[];
}
export const { Provider: GroupedItemContext, useContext: useGroupedItem } =
    createContextFactory((props: GroupedItemContextProps) => {
        const [lineUid, mouldingUid] = [...props?.stepSequence]?.reverse();
        const item = useTakeoffItem();
        const groupClass = new GroupFormClass(mouldingUid);
        function addService() {
            const s = new ServiceClass(mouldingUid);
            s.addServiceLine();
        }
        function addMoulding(selectData) {
            const data = selectData?.data as ZusComponent;

            const component = new ComponentHelperClass(
                mouldingUid,
                data.uid,
                data,
            );
            const groupItem = component.getItemForm()?.groupItem;
            const formUid = generateRandomString();
            groupItem.form[formUid] = {
                stepProductId: {
                    id: data.id,
                },
                mouldingProductId: data.productId,
                selected: true,
                meta: {
                    description: data.title,
                    taxxable: false,
                    produceable: false,
                },
                qty: {
                    total: 1,
                },
                pricing: {
                    addon: "",
                    customPrice: "",
                    unitPrice: sum([
                        groupItem?.pricing?.components?.salesPrice,
                        data?.salesPrice,
                    ]),
                    itemPrice: {
                        salesPrice: data?.salesPrice,
                        basePrice: data?.basePrice,
                    },
                },
                swing: "",
            };
            groupItem.itemIds.push(formUid);
            component.dotUpdateItemForm("groupItem", groupItem);
            component?.updateGroupedCost();
            component?.calculateTotalPrice();
        }
        const setValue = <K extends FieldPath<ZusGroupItemFormPath>>(
            pathName: K,
            lineUid,
            value: FieldPathValue<ZusGroupItemFormPath, K>,
        ) => {
            item.zus.dotUpdate(
                `kvFormItem.${item.itemUid}.groupItem.form.${lineUid}.${pathName}`,
                value as any,
            );
        };
        const mouldings = useAsyncMemo(async () => {
            if (props.itemType != "Moulding") return [];
            const stepClass = new StepHelperClass(mouldingUid);
            const components = await stepClass.fetchStepComponents();
            const filtered = components?.filter((a) => a._metaData.visible);

            return filtered;
        }, [props.itemType, mouldingUid]);
        const valueChanged = () => {
            groupClass.updateGroupedCost();
            groupClass.calculateTotalPrice();
        };
        const mouldingItemStepUid =
            props.itemType == "Moulding" ? mouldingUid : null;
        return {
            addService,
            setValue,
            valueChanged,
            mouldings,
            addMoulding,
            itemType: props.itemType,
            mouldingItemStepUid,
            groupClass,
            removeItem(pathUid) {
                const stepClass = new StepHelperClass(mouldingUid);
                const itemIds = item.itemForm?.groupItem?.itemIds;
                stepClass.dotUpdateItemForm(
                    `groupItem.itemIds`,
                    itemIds.filter((a) => a !== pathUid),
                );
                item.zus.removeKey(
                    `kvFormItem.${item.itemUid}.groupItem.form.${pathUid}`,
                );
                stepClass.calculateTotalPrice();
            },
        };
    });
export const { Provider: LineItemProvider, useContext: useLineItem } =
    createContextFactory(({ index, uid }) => {
        const itemCtx = useTakeoffItem();
        const groupItem = itemCtx?.itemForm?.groupItem;
        const lineForm = groupItem?.form?.[uid];

        return {
            index,
            lineUid: uid,
            lineForm,
        };
    });
