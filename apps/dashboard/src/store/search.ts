import { create } from "zustand";

export type SearchLaunchSource = "sales-create";

interface SearchState {
	isOpen: boolean;
	launchSource: SearchLaunchSource | null;
	openSearch: (source?: SearchLaunchSource) => void;
	setOpen: (isOpen: boolean) => void;
}

export const useSearchStore = create<SearchState>()((set) => ({
	isOpen: false,
	launchSource: null,
	openSearch: (launchSource) =>
		set({ isOpen: true, launchSource: launchSource ?? null }),
	setOpen: (isOpen) =>
		set((state) => ({
			isOpen,
			launchSource: isOpen ? state.launchSource : null,
		})),
}));
