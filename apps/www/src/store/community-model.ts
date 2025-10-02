import { dotObject, dotSet } from "@/app/(clean-code)/_common/utils/utils";
import { getCommunityBlockSchema } from "@community/community-template-schemas";
import { RenturnTypeAsync } from "@gnd/utils";
import { dot } from "dot-object";
import { FieldPath, FieldPathValue } from "react-hook-form";
import { create } from "zustand";

const data = {
    blocks: {} as {
        [uid in string]: RenturnTypeAsync<typeof getCommunityBlockSchema> & {};
    },
    hoverRow: {
        blockId: null,
        rowNo: null,
    },
};
type Action = ReturnType<typeof funcs>;
type Data = typeof data;
export type BlockInput = Data["blocks"][""]["inputConfigs"][number];
type Store = Data & Action;
export type ZusFormSet = (update: (state: Data) => Partial<Data>) => void;

function funcs(set: ZusFormSet) {
    return {
        reset: (resetData) =>
            set((state) => ({
                ...data,
                ...resetData,
            })),
        update: <K extends FieldPath<Data>>(k: K, v: FieldPathValue<Data, K>) =>
            set((state) => {
                const newState = {
                    ...state,
                };
                const d = dotSet(newState);
                d.set(k, v);
                return newState;
            }),
    };
}
export const useCommunityModelStore = create<Store>((set) => ({
    ...data,
    ...funcs(set),
}));

