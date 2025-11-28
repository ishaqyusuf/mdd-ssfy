import { create } from 'zustand';
import type {
  Project,
  Unit,
} from '../components/installers/add-job/dummy-data';

type AddJobState = {
  step: number;
  project: Project | null;
  unit: Unit | null;
  tasks: { taskId: string; qty: number }[];
  isSheetOpen: boolean;
  actions: {
    openSheet: () => void;
    closeSheet: () => void;
    setProject: (project: Project | null) => void;
    setUnit: (unit: Unit | null) => void;
    setTaskQty: (taskId: string, qty: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    reset: () => void;
  };
};

export const useAddJobStore = create<AddJobState>((set, get) => ({
  step: 1,
  project: null,
  unit: null,
  tasks: [],
  isSheetOpen: false,
  actions: {
    openSheet: () => set({ isSheetOpen: true }),
    closeSheet: () => set({ isSheetOpen: false, step: 1, project: null, unit: null, tasks: [] }),
    setProject: (project) => set({ project, unit: null, tasks: [], step: 2 }),
    setUnit: (unit) => set({ unit, tasks: [], step: 3 }),
    setTaskQty: (taskId, qty) => {
      set((state) => ({
        tasks: state.tasks.find((t) => t.taskId === taskId)
          ? state.tasks.map((t) => (t.taskId === taskId ? { ...t, qty } : t))
          : [...state.tasks, { taskId, qty }],
      }));
    },
    nextStep: () => set((state) => ({ step: state.step + 1 })),
    prevStep: () => set((state) => ({ step: state.step - 1 })),
    reset: () => set({ step: 1, project: null, unit: null, tasks: [], isSheetOpen: false }),
  },
}));
