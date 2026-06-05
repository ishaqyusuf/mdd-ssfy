import type { Column, RowSelectionState, Updater } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

interface SalesOrdersState {
    columns: Column<unknown, unknown>[];
    setColumns: (columns: Column<unknown, unknown>[]) => void;
    setRowSelection: (updater: Updater<RowSelectionState>) => void;
    rowSelection: Record<string, boolean>;
    isTableScrolled: boolean;
    setIsTableScrolled: (isTableScrolled: boolean) => void;
    showColumnDividers: boolean;
    setShowColumnDividers: (updater: SetStateAction<boolean>) => void;
    bindShowColumnDividers: (
        value: boolean,
        setter: Dispatch<SetStateAction<boolean>>,
    ) => void;
    showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
    // records: RouterOutputs['sales']['index']['data']
}

export const useSalesOrdersStore = create<SalesOrdersState>((set) => ({
    columns: [],
    rowSelection: {},
    isTableScrolled: false,
    showColumnDividers: false,
    setColumns: (columns) => set({ columns }),
    setIsTableScrolled: (isTableScrolled) => set({ isTableScrolled }),
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
    setShowColumnDividers: (updater) =>
        set((state) => {
            const nextValue =
                typeof updater === "function"
                    ? updater(state.showColumnDividers)
                    : updater;

            state.showColumnDividersSetter?.(nextValue);

            return {
                showColumnDividers: nextValue,
            };
        }),
    bindShowColumnDividers: (value, setter) =>
        set({
            showColumnDividers: value,
            showColumnDividersSetter: setter,
        }),
}));
