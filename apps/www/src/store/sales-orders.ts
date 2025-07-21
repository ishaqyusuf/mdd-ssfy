import { RowSelectionState, Updater } from "@tanstack/react-table";
import { create } from "zustand";

interface SalesOrdersState {
    setRowSelection: (updater: Updater<RowSelectionState>) => void;
    rowSelection: Record<string, boolean>;
}

export const useSalesOrdersStore = create<SalesOrdersState>((set) => ({
    rowSelection: {},
    setRowSelection: (updater: Updater<RowSelectionState>) =>
        set((state) => {
            return {
                rowSelection:
                    typeof updater === "function"
                        ? updater(state.rowSelection)
                        : updater,
            };
        }),
}));

