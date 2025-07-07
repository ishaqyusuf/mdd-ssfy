"use client";
import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";
import { rndTimeout } from "@/lib/timeout";
import { AsyncFnType } from "@/types";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { dotSet } from "@/app/(clean-code)/_common/utils/utils";
import { FieldPath, FieldPathValue } from "react-hook-form";
import { create } from "zustand";

export function ZustandSessionProvider({ children }) {
    const store = useSessionZusStore();
    const path = usePathname();
    useEffect(() => {
        if (store.session) return;
        (async () => {
            await rndTimeout();
            const data = await getLoggedInProfile();
            store.reset({
                session: data,
            });
        })();
    }, [path, store]);
    return <>{children}</>;
}
const data = {
    session: null as AsyncFnType<typeof getLoggedInProfile>,
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
export const useSessionZusStore = create<Store>((set) => ({
    ...data,
    ...funcs(set),
}));
