"use client";

import type {
	Column,
	RowSelectionState,
	Updater,
	VisibilityState,
} from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

import type { SalesProductionRow } from "./columns";

interface SalesProductionTableState {
	columns: Column<SalesProductionRow, unknown>[];
	setColumns: (columns: Column<SalesProductionRow, unknown>[]) => void;
	rowSelection: RowSelectionState;
	setRowSelection: (updater: Updater<RowSelectionState>) => void;
	columnVisibility: VisibilityState;
	setColumnVisibility: (updater: Updater<VisibilityState>) => void;
	showColumnDividers: boolean;
	setShowColumnDividers: (updater: SetStateAction<boolean>) => void;
	bindShowColumnDividers: (
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
}

export const useSalesProductionTableStore = create<SalesProductionTableState>(
	(set) => ({
		columns: [],
		columnVisibility: {},
		rowSelection: {},
		showColumnDividers: false,
		setColumns: (columns) => set({ columns }),
		setColumnVisibility: (updater) =>
			set((state) => ({
				columnVisibility:
					typeof updater === "function"
						? updater(state.columnVisibility)
						: updater,
			})),
		setRowSelection: (updater) =>
			set((state) => ({
				rowSelection:
					typeof updater === "function" ? updater(state.rowSelection) : updater,
			})),
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
	}),
);
