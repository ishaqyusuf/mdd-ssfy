import { create } from "zustand";

// Helper to generate mock jobs

interface JobsState {
  jobs: any[];
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  hasMore: boolean;
  searchQuery: string;
  filters: any; // Define more specific filter types later
}

interface JobsActions {
  fetchJobs: (refresh?: boolean) => Promise<void>;
  loadMoreJobs: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: any) => void;
}

const initialState: JobsState = {
  jobs: [],
  loading: false,
  error: null,
  page: 0,
  pageSize: 10,
  hasMore: true,
  searchQuery: "",
  filters: {},
};

export const useJobsStore = create<JobsState & JobsActions>((set, get) => ({
  ...initialState,

  fetchJobs: async (refresh = false) => {},

  loadMoreJobs: async () => {},

  setSearchQuery: (query: string) => {
    set({ searchQuery: query, page: 0, jobs: [], hasMore: true });
    get().fetchJobs(true); // Refetch jobs with new search query
  },

  setFilters: (filters: any) => {
    set({ filters, page: 0, jobs: [], hasMore: true });
    get().fetchJobs(true); // Refetch jobs with new filters
  },
}));
