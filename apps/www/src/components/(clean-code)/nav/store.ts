import { NavGroup } from "@/app/(clean-code)/_common/utils/get-menu-list";
import { persist, createJSONStorage } from "zustand/middleware";
import { dotObject, dotSet } from "@/app/(clean-code)/_common/utils/utils";
import { FieldPath, FieldPathValue } from "react-hook-form";
import { create } from "zustand";

const data = {
    groupedMenu: [] as NavGroup[],
    isOpen: false,
};
type Action = ReturnType<typeof funcs>;
type Data = typeof data;
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
export const useNavStore = create<Store>(
    persist(
        (set) => ({
            ...data,
            ...funcs(set),
        }),
        {
            name: "sidebarOpen",
            storage: createJSONStorage(() => localStorage),
        }
    ) as any
);
// export const useNavStore = create<Store>((set) => ({
//     ...data,
//     ...funcs(set),
// }));
