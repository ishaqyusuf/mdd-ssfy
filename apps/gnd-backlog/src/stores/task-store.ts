"use client";
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type TaskStatus = 'pending' | 'in-progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: TaskStatus;
  statusHistory: { status: TaskStatus; timestamp: Date }[];
  notes: string[];
}

interface TaskStoreState {
  tasks: Task[];
  filteredTags: string[];
  actions: {
    addTask: (task: Omit<Task, 'id' | 'statusHistory' | 'status' | 'notes'>) => void;
    deleteTask: (id: string) => void;
    updateTaskStatus: (id: string, status: TaskStatus) => void;
    addNoteToTask: (id: string, note: string) => void;
    toggleTagFilter: (tag: string) => void;
    startTask: (id: string) => void;
    stopTask: (id: string) => void;
    completeTask: (id: string) => void;
  };
}

const useTaskStore = create<TaskStoreState>()(
  immer((set) => ({
    tasks: [
        {
            id: '1',
            title: 'Implement feature X',
            description: 'As a user, I want to be able to do X.',
            tags: ['feature', 'frontend'],
            status: 'pending',
            statusHistory: [{ status: 'pending', timestamp: new Date() }],
            notes: ['Initial note.'],
        },
        {
            id: '2',
            title: 'Fix bug Y',
            description: 'When a user does Y, Z happens unexpectedly.',
            tags: ['bug', 'backend'],
            status: 'in-progress',
            statusHistory: [
                { status: 'pending', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
                { status: 'in-progress', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
            ],
            notes: [],
        },
    ],
    filteredTags: [],
    actions: {
      addTask: (task) =>
        set((state) => {
          state.tasks.push({
            ...task,
            id: new Date().toISOString(),
            status: 'pending',
            statusHistory: [{ status: 'pending', timestamp: new Date() }],
            notes: [],
          });
        }),
      deleteTask: (id) =>
        set((state) => {
          state.tasks = state.tasks.filter((task) => task.id !== id);
        }),
      updateTaskStatus: (id, status) =>
        set((state) => {
          const task = state.tasks.find((task) => task.id === id);
          if (task) {
            task.status = status;
            task.statusHistory.push({ status, timestamp: new Date() });
          }
        }),
      addNoteToTask: (id, note) =>
        set((state) => {
          const task = state.tasks.find((task) => task.id === id);
          if (task) {
            task.notes.push(note);
          }
        }),
      toggleTagFilter: (tag) =>
        set((state) => {
          if (state.filteredTags.includes(tag)) {
            state.filteredTags = state.filteredTags.filter((t) => t !== tag);
          } else {
            state.filteredTags.push(tag);
          }
        }),
      startTask: (id) => {
        set((state) => {
            const task = state.tasks.find((task) => task.id === id);
            if (task && task.status !== 'in-progress') {
                task.status = 'in-progress';
                task.statusHistory.push({ status: 'in-progress', timestamp: new Date() });
            }
        });
      },
      stopTask: (id) => {
        set((state) => {
            const task = state.tasks.find((task) => task.id === id);
            if (task && task.status === 'in-progress') {
                task.status = 'pending';
                task.statusHistory.push({ status: 'pending', timestamp: new Date() });
            }
        });
      },
      completeTask: (id) => {
        set((state) => {
            const task = state.tasks.find((task) => task.id === id);
            if (task && task.status !== 'completed') {
                task.status = 'completed';
                task.statusHistory.push({ status: 'completed', timestamp: new Date() });
            }
        });
      }
    },
  })),
);

export const useTasks = () => useTaskStore((state) => {
    if (state.filteredTags.length === 0) {
        return state.tasks;
    }
    return state.tasks.filter(task =>
        state.filteredTags.every(tag => task.tags.includes(tag))
    );
});
export const useTaskActions = () => useTaskStore((state) => state.actions);
export const useFilteredTags = () => useTaskStore((state) => state.filteredTags);
export const useAllTags = () => useTaskStore((state) => [...new Set(state.tasks.flatMap(task => task.tags))]);
