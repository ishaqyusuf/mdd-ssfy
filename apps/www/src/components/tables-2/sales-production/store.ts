"use client";

import type { Column, Updater, VisibilityState } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

import type { SalesProductionRow } from "./columns";

interface SalesProductionTableState {
	columns: Column<SalesProductionRow, unknown>[];
	setColumns: (columns: Column<SalesProductionRow, unknown>[]) => void;
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
		showColumnDividers: false,
		setColumns: (columns) => set({ columns }),
		setColumnVisibility: (updater) =>
			set((state) => ({
				columnVisibility:
					typeof updater === "function"
						? updater(state.columnVisibility)
						: updater,
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
