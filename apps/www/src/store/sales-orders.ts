import type { Column, RowSelectionState, Updater } from "@tanstack/react-table";
import { create } from "zustand";

interface SalesOrdersState {
    columns: Column<unknown, unknown>[];
    setColumns: (columns: Column<unknown, unknown>[]) => void;
    setRowSelection: (updater: Updater<RowSelectionState>) => void;
    rowSelection: Record<string, boolean>;
    // records: RouterOutputs['sales']['index']['data']
}

export const useSalesOrdersStore = create<SalesOrdersState>((set) => ({
    columns: [],
    rowSelection: {},
    setColumns: (columns) => set({ columns }),
    setRowSelection: (updater: Updater<RowSelectionState>) =>
        set((state) => {
            return {
                // records: [],
                rowSelection:
                    typeof updater === "function"
                        ? updater(state.rowSelection)
                        : updater,
            };
        }),
}));
