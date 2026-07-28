import { create } from "zustand";
import { RouterOutputs } from "@api/trpc/routers/_app";

type JobOverviewState = {
  isModalOpen: boolean;
  job: RouterOutputs["jobs"]["getJobs"]["data"][number] | null; //DetailedJob | null;
};

type JobOverviewActions = {
  actions: {
    openModal: (job: RouterOutputs["jobs"]["getJobs"]["data"][number]) => void;
    closeModal: () => void;
  };
};

const initialState: JobOverviewState = {
  isModalOpen: false,
  job: null,
};

export const useJobOverviewStore = create<
  JobOverviewState & JobOverviewActions
>()((set) => ({
  ...initialState,
  actions: {
    openModal: (job) => set({ isModalOpen: true, job }),
    closeModal: () => set({ isModalOpen: false, job: null }),
  },
}));
