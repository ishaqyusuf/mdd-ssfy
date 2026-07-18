"use client";

import type { Column } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

import type { EmployeeRow } from "./columns";

interface EmployeesTableState {
	columns: Column<EmployeeRow, unknown>[];
	setColumns: (columns: Column<EmployeeRow, unknown>[]) => void;
	showColumnDividers: boolean;
	setShowColumnDividers: (updater: SetStateAction<boolean>) => void;
	bindShowColumnDividers: (
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
}

export const useEmployeesTableStore = create<EmployeesTableState>((set) => ({
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
