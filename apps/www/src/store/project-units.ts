import type { RowSelectionState, Updater } from "@tanstack/react-table";
import { create } from "zustand";

interface ProjectUnitsState {
	rowSelection: Record<string, boolean>;
	setRowSelection: (updater: Updater<RowSelectionState>) => void;
}

export const useProjectUnitsStore = create<ProjectUnitsState>((set) => ({
	rowSelection: {},
	setRowSelection: (updater: Updater<RowSelectionState>) =>
		set((state) => ({
			rowSelection:
				typeof updater === "function" ? updater(state.rowSelection) : updater,
		})),
}));
