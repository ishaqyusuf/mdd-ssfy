import { RouterInputs } from "@api/trpc/routers/_app";
import { dotObject } from "@gnd/utils";
import { FieldPath, FieldPathValue } from "react-hook-form";
import { create } from "zustand";

const data = {
  form: {} as RouterInputs["jobs"]["createJob"],
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
        dotObject.set(k, v, newState);
        return newState;
      }),
  };
}
export const useJobFormStore = create<Store>((set) => ({
  ...data,
  ...funcs(set),
}));
