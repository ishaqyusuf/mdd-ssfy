import { create } from 'zustand';
import { DetailedJob, JobStatus, PaymentStatus } from '@/components/installers/job-overview/types';
import { PROJECTS, UNITS, TASKS } from '@/components/installers/add-job/dummy-data';

// Helper to generate mock jobs
const generateMockJobs = (count: number, offset: number = 0): DetailedJob[] => {
  const mockJobs: DetailedJob[] = [];
  for (let i = 0; i < count; i++) {
    const id = `job-${offset + i + 1}`;
    const project = PROJECTS[Math.floor(Math.random() * PROJECTS.length)];
    const unit = UNITS.filter(u => u.projectId === project.id)[Math.floor(Math.random() * UNITS.filter(u => u.projectId === project.id).length)];
    const taskCount = Math.floor(Math.random() * 3) + 1;
    const tasks = Array.from({ length: taskCount }).map(() => {
      const task = TASKS[Math.floor(Math.random() * TASKS.length)];
      const quantity = Math.floor(Math.random() * 5) + 1;
      return { task, quantity };
    });
    const totalInstallCost = tasks.reduce((sum, t) => sum + t.task.ratePerUnit * t.quantity, 0);
    const jobStatus: JobStatus = ['Pending Submission', 'Submitted', 'In Progress', 'Completed'][Math.floor(Math.random() * 4)] as JobStatus;
    const paymentStatus: PaymentStatus = ['Unpaid', 'Partially Paid', 'Paid'][Math.floor(Math.random() * 3)] as PaymentStatus;
    const submissionDate = jobStatus !== 'Pending Submission' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined;

    mockJobs.push({
      id,
      project,
      unit,
      model: unit.name.split(' ')[0], // Simple mock model
      tasks,
      totalInstallCost,
      jobStatus,
      paymentStatus,
      submissionDate,
    });
  }
  return mockJobs;
};

interface JobsState {
  jobs: DetailedJob[];
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
  searchQuery: '',
  filters: {},
};

export const useJobsStore = create<JobsState & JobsActions>((set, get) => ({
  ...initialState,

  fetchJobs: async (refresh = false) => {
    set({ loading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { pageSize, page, searchQuery, filters } = get();
      const newJobs = generateMockJobs(pageSize, refresh ? 0 : page * pageSize);

      // Apply mock search/filter logic
      const filteredJobs = newJobs.filter(job => {
        const matchesSearch = searchQuery
          ? job.project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.tasks.some(t => t.task.name.toLowerCase().includes(searchQuery.toLowerCase()))
          : true;
        // Add more complex filter logic here based on 'filters' state
        return matchesSearch;
      });

      set((state) => ({
        jobs: refresh ? filteredJobs : [...state.jobs, ...filteredJobs],
        page: refresh ? 1 : state.page + 1,
        hasMore: filteredJobs.length === pageSize, // Assume hasMore if we got a full page
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  loadMoreJobs: async () => {
    if (!get().loading && get().hasMore) {
      await get().fetchJobs();
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query, page: 0, jobs: [], hasMore: true });
    get().fetchJobs(true); // Refetch jobs with new search query
  },

  setFilters: (filters: any) => {
    set({ filters, page: 0, jobs: [], hasMore: true });
    get().fetchJobs(true); // Refetch jobs with new filters
  },
}));
