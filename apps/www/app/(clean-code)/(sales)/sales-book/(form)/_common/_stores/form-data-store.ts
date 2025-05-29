import { create } from "zustand";

import { SalesFormZusData } from "../../../../types";
import { FieldPath } from "react-hook-form";
import { dotObject } from "@/app/(clean-code)/_common/utils/utils";
import { deepCopy } from "@/lib/deep-copy";
export type ZusSales = SalesFormZusData & SalesFormZusAction;
export type ZusComponent = ZusSales["kvStepComponentList"][number][number];
export type ZusStepFormData = ZusSales["kvStepForm"][number];
export type ZusItemFormData = ZusSales["kvFormItem"][number];
export type ZusGroupItem = ZusItemFormData["groupItem"];
export type ZusGroupItemForm = ZusItemFormData["groupItem"]["form"];
export type ZusGroupItemFormPath = ZusGroupItemForm[string];
type SalesFormZusAction = ReturnType<typeof fns>;
export type SalesFormSet = (
    update: (state: SalesFormZusData) => Partial<SalesFormZusData>,
) => void;
function fns(set: SalesFormSet) {
    return {
        initOldFormState: (data) =>
            set((state) => {
                return {
                    ...state,
                    oldFormState: deepCopy({
                        kvFormItem: data.kvFormItem,
                        kvStepForm: data.kvStepForm,
                        metaData: data.metaData,
                    }) as any,
                };
            }),
        init: (data) =>
            set((state) => {
                let newData = {
                    ...state,
                    ...data,
                    oldFormState: deepCopy({
                        kvFormItem: data.kvFormItem,
                        kvStepForm: data.kvStepForm,
                        metaData: data.metaData,
                        sequence: data.sequence,
                    }),
                };

                return newData;
            }),
        newStep: (itemUid, stepUid) =>
            set((state) => {
                const newState = { ...state };
                newState.sequence.stepComponent[itemUid].push(stepUid);
                return newState;
            }),
        toggleItem: (itemUid) =>
            set((state) => {
                const newState = { ...state };
                newState.kvFormItem[itemUid].collapsed =
                    !newState.kvFormItem[itemUid].collapsed;
                return newState;
            }),

        removeKey: <K extends FieldPath<SalesFormZusData>>(k: K) =>
            set((state) => {
                const newState = {
                    ...state,
                };
                dotObject.remove(k, newState);
                return newState;
            }),
        dotUpdate: <K extends FieldPath<SalesFormZusData>>(
            k: K,
            stepSq, //: FieldPathValue<SalesFormZusData, K>
        ) =>
            set((state) => {
                const newState = {
                    ...state,
                };
                dotObject.set(k, stepSq, newState);
                return newState;
            }),

        update: (k: keyof SalesFormZusData, value) =>
            set((state) => {
                const newState: any = { ...state };
                newState[k] = value;

                return newState;
            }),
        updateFormItem: (
            uid,
            k: keyof SalesFormZusData["kvFormItem"][number],
            value,
        ) =>
            set((state) => {
                const newState = { ...state };
                (newState.kvFormItem[uid] as any)[k] = value as any;
                return newState;
            }),
        removeItem: (uid, index) =>
            set((state) => {
                const newState = { ...state };
                newState.sequence.formItem.splice(index, 1);
                return newState;
            }),
    };
}
export const useFormDataStore = create<ZusSales>(
    (set) =>
        ({
            ...fns(set),
        }) as any,
);
export const getFormState = () => useFormDataStore.getState();
