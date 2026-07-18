"use client";

import type { Column, RowSelectionState } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

import type { ProjectUnitRow } from "./columns";

interface ProjectUnitsTableState {
	columns: Column<ProjectUnitRow, unknown>[];
	rowSelection: RowSelectionState;
	showColumnDividers: boolean;
	setColumns: (columns: Column<ProjectUnitRow, unknown>[]) => void;
	setRowSelection: (updater: SetStateAction<RowSelectionState>) => void;
	setShowColumnDividers: (updater: SetStateAction<boolean>) => void;
	bindShowColumnDividers: (
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
}

export const useProjectUnitsTableStore = create<ProjectUnitsTableState>(
	(set) => ({
		columns: [],
		rowSelection: {},
		showColumnDividers: false,
		setColumns: (columns) => set({ columns }),
		setRowSelection: (updater) =>
			set((state) => ({
				rowSelection:
					typeof updater === "function"
						? updater(state.rowSelection)
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
