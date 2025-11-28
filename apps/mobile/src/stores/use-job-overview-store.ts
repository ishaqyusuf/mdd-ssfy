import { create } from 'zustand';
import { DetailedJob } from '../components/installers/job-overview/types';

type JobOverviewState = {
  isModalOpen: boolean;
  job: DetailedJob | null;
};

type JobOverviewActions = {
  actions: {
    openModal: (job: DetailedJob) => void;
    closeModal: () => void;
  };
};

const initialState: JobOverviewState = {
  isModalOpen: false,
  job: null,
};

export const useJobOverviewStore = create<JobOverviewState & JobOverviewActions>()((set) => ({
  ...initialState,
  actions: {
    openModal: (job) => set({ isModalOpen: true, job }),
    closeModal: () => set({ isModalOpen: false, job: null }),
  },
}));
