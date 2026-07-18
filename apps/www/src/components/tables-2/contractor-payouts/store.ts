"use client";

import type { Column, RowSelectionState } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

import type { ContractorPayoutRow } from "./columns";

interface ContractorPayoutsTableState {
	columns: Column<ContractorPayoutRow, unknown>[];
	setColumns: (columns: Column<ContractorPayoutRow, unknown>[]) => void;
	rowSelection: RowSelectionState;
	setRowSelection: (
		updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState),
	) => void;
	showColumnDividers: boolean;
	setShowColumnDividers: (updater: SetStateAction<boolean>) => void;
	bindShowColumnDividers: (
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
}

export const useContractorPayoutsTableStore =
	create<ContractorPayoutsTableState>((set) => ({
		columns: [],
		rowSelection: {},
		showColumnDividers: false,
		setColumns: (columns) => set({ columns }),
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
	}));
