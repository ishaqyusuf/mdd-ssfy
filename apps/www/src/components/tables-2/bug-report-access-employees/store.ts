"use client";

import type { Column } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

import type { BugReportAccessEmployeeRow } from "./columns";

interface BugReportAccessEmployeesTableState {
	columns: Column<BugReportAccessEmployeeRow, unknown>[];
	setColumns: (columns: Column<BugReportAccessEmployeeRow, unknown>[]) => void;
	showColumnDividers: boolean;
	setShowColumnDividers: (updater: SetStateAction<boolean>) => void;
	bindShowColumnDividers: (
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
}

export const useBugReportAccessEmployeesTableStore =
	create<BugReportAccessEmployeesTableState>((set) => ({
		columns: [],
		showColumnDividers: false,
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
	}));
