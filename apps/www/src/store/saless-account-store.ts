import { RowSelectionState, Updater } from "@tanstack/react-table";
import { create } from "zustand";

interface SalesAccountingState {
    setRowSelection: (updater: Updater<RowSelectionState>) => void;
    rowSelection: Record<string, boolean>;
    // records: RouterOutputs['sales']['index']['data']
}

export const useSalesAccountingStore = create<SalesAccountingState>((set) => ({
    rowSelection: {},
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

