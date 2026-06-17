"use client";

import type { Column } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

import type { TableViewMode } from "@/utils/table-settings";

interface SalesStatisticsTableState {
	columns: Column<unknown, unknown>[];
	setColumns: (columns: Column<unknown, unknown>[]) => void;
	showColumnDividers: boolean;
	setShowColumnDividers: (updater: SetStateAction<boolean>) => void;
	bindShowColumnDividers: (
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
	viewMode: TableViewMode;
	setViewMode: (updater: SetStateAction<TableViewMode>) => void;
	bindViewMode: (
		value: TableViewMode,
		setter: Dispatch<SetStateAction<TableViewMode>>,
	) => void;
	viewModeSetter?: Dispatch<SetStateAction<TableViewMode>>;
}

export const useSalesStatisticsTableStore = create<SalesStatisticsTableState>(
	(set) => ({
		columns: [],
		showColumnDividers: false,
		viewMode: "table",
		setColumns: (columns) => set({ columns }),
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
		setViewMode: (updater) =>
			set((state) => {
				const nextValue =
					typeof updater === "function" ? updater(state.viewMode) : updater;

				state.viewModeSetter?.(nextValue);

				return {
					viewMode: nextValue,
				};
			}),
		bindViewMode: (value, setter) =>
			set({
				viewMode: value,
				viewModeSetter: setter,
			}),
	}),
);
