import { dotSet } from "@/app/(clean-code)/_common/utils/utils";
import { FieldPath, FieldPathValue } from "react-hook-form";
import z from "zod";
import { create } from "zustand";

import { schema } from "./context";
import { getLinkModules } from "./links";

const data = {
    render: false,
    siteModules: {},
    activeLinkName: null,
    subLinks: {},
    links: {},
    linkModule: {},
} as z.infer<typeof schema> & { linkModule: ReturnType<typeof getLinkModules> };
type Action = ReturnType<typeof funcs>;
type Data = typeof data;
type Store = Data & Action;
export type ZusFormSet = (update: (state: Data) => Partial<Data>) => void;

function funcs(set: ZusFormSet) {
    return {
        reset: (resetData = {}) =>
            set((state) => ({
                ...data,
                ...resetData,
                render: true,
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
export const useSidebarStore = create<Store>((set) => ({
    ...data,
    ...funcs(set),
}));
