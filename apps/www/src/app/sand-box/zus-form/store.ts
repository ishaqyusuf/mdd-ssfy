import { dotObject } from "@/app/(clean-code)/_common/utils/utils";
import { FieldPath } from "react-hook-form";
import { create } from "zustand";

export type ZusFormSet = (update: (state: ZusData) => Partial<ZusData>) => void;
type ZusAction = ReturnType<typeof fns>;
type ZusData = typeof data;
export type Zus = ZusData & ZusAction;
const data = {
    data: {
        name: "",
        stepSequence: {
            formItem: [],
            stepItem: {},
        },
        kv: {
            abc: {
                name: "",
            },
        },
    },
};
function fns(set: ZusFormSet) {
    return {
        setData: (data) =>
            set((state) => {
                return {
                    ...state,
                    ...data,
                };
            }),
        dotUpdate: <K extends FieldPath<ZusData>>(
            k: K,
            stepSq //: FieldPathValue<SalesFormZusData, K>
        ) =>
            set((state) => {
                const newState = {
                    ...state,
                };
                dotObject.set(k, stepSq, newState);
                return newState;
            }),
    };
}
export const useZusStore = create<Zus>((set) => ({
    ...data,
    ...fns(set),
}));
