import { create } from "zustand";

type State = {
    products: any[];
    loadedComponentsByStepTitle: {};
};
type Action = {
    updateComponent: (key, data) => void;
};
export type IDykeComponentStore = State & Action;
export const useDykeComponentStore = create<IDykeComponentStore>((set) => ({
    products: [],
    loadedComponentsByStepTitle: {},
    updateComponent: (key, data) => {
        set((state) => ({
            loadedComponentsByStepTitle: {
                ...state.loadedComponentsByStepTitle,
                [key]: data,
            },
        }));
        // set({
        //     products: newProducts,
        // });
    },
}));
